export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  ASSETS: Fetcher;
}

export type Pen = {
  id: string;
  title: string;
  slug: string;
  html: string;
  css: string;
  js: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type AssetRow = {
  id: string;
  pen_id: string;
  r2_key: string;
  filename: string;
  content_type: string;
  size: number;
  created_at: string;
};

type UploadedFile = {
  name: string;
  type: string;
  size: number;
  stream: () => ReadableStream;
};

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8"
};

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);

      if (url.pathname.startsWith("/api/")) {
        return await handleApi(request, env, url);
      }

      if (url.pathname.startsWith("/assets/")) {
        return await handleAssetRead(env, url.pathname);
      }

      return env.ASSETS.fetch(request);
    } catch (error) {
      if (error instanceof ApiError) {
        return jsonError(error.status, error.code, error.message);
      }

      console.error(error);
      return jsonError(500, "internal_error", "Something went wrong.");
    }
  }
};

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  const method = request.method.toUpperCase();
  const parts = url.pathname.split("/").filter(Boolean);

  if (method === "GET" && url.pathname === "/api/pens") {
    const { results } = await env.DB.prepare(
      "SELECT id, title, slug, html, css, js, created_at, updated_at, deleted_at FROM pens WHERE deleted_at IS NULL ORDER BY updated_at DESC"
    ).all<Pen>();
    return json({ pens: results });
  }

  if (method === "POST" && url.pathname === "/api/pens") {
    const body = await readJson<Partial<Pick<Pen, "title" | "html" | "css" | "js">>>(request);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const slug = randomToken();
    const pen: Pen = {
      id,
      slug,
      title: normalizeTitle(body.title),
      html: body.html ?? "",
      css: body.css ?? "",
      js: body.js ?? "",
      created_at: now,
      updated_at: now,
      deleted_at: null
    };

    await env.DB.prepare(
      "INSERT INTO pens (id, title, slug, html, css, js, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)"
    )
      .bind(pen.id, pen.title, pen.slug, pen.html, pen.css, pen.js, pen.created_at, pen.updated_at)
      .run();

    return json({ pen }, 201);
  }

  if (parts[0] === "api" && parts[1] === "pens" && parts[2]) {
    const penId = parts[2];

    if (method === "GET" && parts.length === 3) {
      return json({ pen: await getActivePen(env, penId) });
    }

    if (method === "PUT" && parts.length === 3) {
      const body = await readJson<Partial<Pick<Pen, "title" | "html" | "css" | "js">>>(request);
      const current = await getActivePen(env, penId);
      const updated: Pen = {
        ...current,
        title: body.title === undefined ? current.title : normalizeTitle(body.title),
        html: body.html ?? current.html,
        css: body.css ?? current.css,
        js: body.js ?? current.js,
        updated_at: new Date().toISOString()
      };

      await env.DB.prepare(
        "UPDATE pens SET title = ?, html = ?, css = ?, js = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL"
      )
        .bind(updated.title, updated.html, updated.css, updated.js, updated.updated_at, penId)
        .run();

      return json({ pen: updated });
    }

    if (method === "DELETE" && parts.length === 3) {
      await getActivePen(env, penId);
      await env.DB.prepare("UPDATE pens SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL")
        .bind(new Date().toISOString(), new Date().toISOString(), penId)
        .run();
      return json({ ok: true });
    }

    if (method === "POST" && parts[3] === "fork" && parts.length === 4) {
      const source = await getActivePen(env, penId);
      const now = new Date().toISOString();
      const fork: Pen = {
        ...source,
        id: crypto.randomUUID(),
        slug: randomToken(),
        title: `${source.title} (Fork)`,
        created_at: now,
        updated_at: now,
        deleted_at: null
      };

      await env.DB.prepare(
        "INSERT INTO pens (id, title, slug, html, css, js, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)"
      )
        .bind(fork.id, fork.title, fork.slug, fork.html, fork.css, fork.js, fork.created_at, fork.updated_at)
        .run();

      return json({ pen: fork }, 201);
    }

    if (method === "GET" && parts[3] === "assets" && parts.length === 4) {
      await getActivePen(env, penId);
      const { results } = await env.DB.prepare(
        "SELECT id, pen_id, r2_key, filename, content_type, size, created_at FROM assets WHERE pen_id = ? ORDER BY created_at DESC"
      )
        .bind(penId)
        .all<AssetRow>();
      return json({ assets: results.map(publicAsset) });
    }

    if (method === "POST" && parts[3] === "assets" && parts.length === 4) {
      return await handleAssetUpload(request, env, penId);
    }

    if (parts[3] === "assets" && parts[4] && parts.length === 5) {
      const assetId = parts[4];

      if (method === "PATCH") {
        return await handleAssetRename(request, env, penId, assetId);
      }

      if (method === "DELETE") {
        return await handleAssetDelete(env, penId, assetId);
      }
    }
  }

  if (method === "GET" && parts[0] === "api" && parts[1] === "shared" && parts[2] && parts.length === 3) {
    const pen = await env.DB.prepare(
      "SELECT id, title, slug, html, css, js, created_at, updated_at, deleted_at FROM pens WHERE slug = ? AND deleted_at IS NULL"
    )
      .bind(parts[2])
      .first<Pen>();

    if (!pen) {
      throw new ApiError(404, "not_found", "Shared pen not found.");
    }

    const { results: assets } = await env.DB.prepare(
      "SELECT id, pen_id, r2_key, filename, content_type, size, created_at FROM assets WHERE pen_id = ? ORDER BY created_at DESC"
    )
      .bind(pen.id)
      .all<AssetRow>();

    return json({ pen, assets: assets.map(publicAsset) });
  }

  throw new ApiError(404, "not_found", "Endpoint not found.");
}

async function handleAssetUpload(request: Request, env: Env, penId: string): Promise<Response> {
  await getActivePen(env, penId);

  const form = await request.formData();
  const entry = form.get("file") as unknown;
  if (!isUploadedFile(entry)) {
    throw new ApiError(400, "missing_file", "Upload must include a file field.");
  }
  const file = entry;

  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new ApiError(413, "file_too_large", "Assets must be 10 MB or smaller.");
  }

  const id = crypto.randomUUID();
  const filename = sanitizeFilename(file.name || "asset") || "asset";
  const key = `pens/${penId}/assets/${id}-${filename}`;
  const contentType = file.type || "application/octet-stream";
  const createdAt = new Date().toISOString();

  await env.BUCKET.put(key, file.stream(), {
    httpMetadata: {
      contentType
    }
  });

  const row: AssetRow = {
    id,
    pen_id: penId,
    r2_key: key,
    filename,
    content_type: contentType,
    size: file.size,
    created_at: createdAt
  };

  await env.DB.prepare(
    "INSERT INTO assets (id, pen_id, r2_key, filename, content_type, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(row.id, row.pen_id, row.r2_key, row.filename, row.content_type, row.size, row.created_at)
    .run();

  return json({ asset: publicAsset(row) }, 201);
}

async function handleAssetRename(request: Request, env: Env, penId: string, assetId: string): Promise<Response> {
  await getActivePen(env, penId);
  const asset = await getPenAsset(env, penId, assetId);
  const body = await readJson<{ filename?: unknown }>(request);
  const filename = sanitizeFilename(String(body.filename ?? ""));
  if (!filename) {
    throw new ApiError(400, "invalid_filename", "Asset filename is required.");
  }

  const updated: AssetRow = {
    ...asset,
    filename
  };

  await env.DB.prepare("UPDATE assets SET filename = ? WHERE id = ? AND pen_id = ?").bind(filename, assetId, penId).run();
  return json({ asset: publicAsset(updated) });
}

async function handleAssetDelete(env: Env, penId: string, assetId: string): Promise<Response> {
  await getActivePen(env, penId);
  const asset = await getPenAsset(env, penId, assetId);

  await env.BUCKET.delete(asset.r2_key);
  await env.DB.prepare("DELETE FROM assets WHERE id = ? AND pen_id = ?").bind(assetId, penId).run();
  return json({ ok: true });
}

async function handleAssetRead(env: Env, pathname: string): Promise<Response> {
  const assetId = pathname.split("/").filter(Boolean)[1];
  if (!assetId) {
    throw new ApiError(404, "not_found", "Asset not found.");
  }

  const asset = await env.DB.prepare(
    "SELECT id, pen_id, r2_key, filename, content_type, size, created_at FROM assets WHERE id = ?"
  )
    .bind(assetId)
    .first<AssetRow>();

  if (!asset) {
    throw new ApiError(404, "not_found", "Asset not found.");
  }

  const object = await env.BUCKET.get(asset.r2_key);
  if (!object) {
    throw new ApiError(404, "not_found", "Asset object not found.");
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Type", asset.content_type);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("Content-Disposition", `inline; filename="${asset.filename.replaceAll('"', "")}"`);

  return new Response(object.body, { headers });
}

async function getPenAsset(env: Env, penId: string, assetId: string): Promise<AssetRow> {
  const asset = await env.DB.prepare(
    "SELECT id, pen_id, r2_key, filename, content_type, size, created_at FROM assets WHERE id = ? AND pen_id = ?"
  )
    .bind(assetId, penId)
    .first<AssetRow>();

  if (!asset) {
    throw new ApiError(404, "not_found", "Asset not found.");
  }

  return asset;
}

async function getActivePen(env: Env, id: string): Promise<Pen> {
  const pen = await env.DB.prepare(
    "SELECT id, title, slug, html, css, js, created_at, updated_at, deleted_at FROM pens WHERE id = ? AND deleted_at IS NULL"
  )
    .bind(id)
    .first<Pen>();

  if (!pen) {
    throw new ApiError(404, "not_found", "Pen not found.");
  }

  return pen;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS
  });
}

function jsonError(status: number, code: string, message: string): Response {
  return json({ error: { code, message } }, status);
}

async function readJson<T>(request: Request): Promise<T> {
  if (!request.headers.get("Content-Type")?.includes("application/json")) {
    throw new ApiError(415, "unsupported_media_type", "Expected application/json.");
  }

  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError(400, "invalid_json", "Request body is not valid JSON.");
  }
}

function normalizeTitle(value: unknown): string {
  if (typeof value !== "string") {
    return "Untitled Pen";
  }

  const title = value.trim();
  return title.length > 0 ? title.slice(0, 120) : "Untitled Pen";
}

function sanitizeFilename(value: string): string {
  const safe = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return safe;
}

function isUploadedFile(value: unknown): value is UploadedFile {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    "size" in value &&
    "stream" in value &&
    typeof (value as UploadedFile).name === "string" &&
    typeof (value as UploadedFile).size === "number" &&
    typeof (value as UploadedFile).stream === "function"
  );
}

function randomToken(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function publicAsset(asset: AssetRow) {
  return {
    id: asset.id,
    penId: asset.pen_id,
    filename: asset.filename,
    contentType: asset.content_type,
    size: asset.size,
    createdAt: asset.created_at,
    url: `/assets/${asset.id}`
  };
}
