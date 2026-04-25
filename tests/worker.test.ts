import { beforeEach, describe, expect, it } from "vitest";
import worker, { type Env, type Pen } from "../src/worker";

type StoredAsset = {
  id: string;
  pen_id: string;
  r2_key: string;
  filename: string;
  content_type: string;
  size: number;
  created_at: string;
};

let env: Env;

beforeEach(() => {
  env = {
    DB: new FakeD1(),
    BUCKET: new FakeR2(),
    ASSETS: {
      fetch: async () => new Response("asset fallback"),
      connect: (() => {
        throw new Error("Not implemented in tests.");
      }) as Fetcher["connect"]
    }
  } as unknown as Env;
});

describe("Worker API", () => {
  it("creates, lists, updates, and deletes pens", async () => {
    const createdResponse = await request("/api/pens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Demo", html: "<h1>Demo</h1>" })
    });
    expect(createdResponse.status).toBe(201);
    const created = (await createdResponse.json()) as { pen: Pen };

    const updatedResponse = await request(`/api/pens/${created.pen.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Updated", html: "<p>Updated</p>", css: "p{}", js: "" })
    });
    expect(updatedResponse.status).toBe(200);
    const updated = (await updatedResponse.json()) as { pen: Pen };
    expect(updated.pen.title).toBe("Updated");

    const listResponse = await request("/api/pens");
    const listed = (await listResponse.json()) as { pens: Pen[] };
    expect(listed.pens).toHaveLength(1);

    const deleteResponse = await request(`/api/pens/${created.pen.id}`, { method: "DELETE" });
    expect(deleteResponse.status).toBe(200);

    const listAfterDeleteResponse = await request("/api/pens");
    const afterDelete = (await listAfterDeleteResponse.json()) as { pens: Pen[] };
    expect(afterDelete.pens).toHaveLength(0);
  });

  it("loads shared pens and forks them", async () => {
    const created = (await (
      await request("/api/pens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Shared", html: "<h1>Shared</h1>", css: "h1{}", js: "console.log(1)" })
      })
    ).json()) as { pen: Pen };

    const sharedResponse = await request(`/api/shared/${created.pen.slug}`);
    expect(sharedResponse.status).toBe(200);
    const shared = (await sharedResponse.json()) as { pen: Pen };
    expect(shared.pen.id).toBe(created.pen.id);

    const forkResponse = await request(`/api/pens/${created.pen.id}/fork`, { method: "POST" });
    expect(forkResponse.status).toBe(201);
    const forked = (await forkResponse.json()) as { pen: Pen };
    expect(forked.pen.id).not.toBe(created.pen.id);
    expect(forked.pen.title).toBe("Shared (Fork)");
  });

  it("validates asset upload metadata and serves uploaded assets", async () => {
    const created = (await (
      await request("/api/pens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Assets" })
      })
    ).json()) as { pen: Pen };

    const form = new FormData();
    form.append("file", new File(["hello"], "Hello Image.txt", { type: "text/plain" }));

    const uploadResponse = await request(`/api/pens/${created.pen.id}/assets`, {
      method: "POST",
      body: form
    });
    expect(uploadResponse.status).toBe(201);
    const upload = (await uploadResponse.json()) as { asset: { id: string; url: string; filename: string } };
    expect(upload.asset.filename).toBe("hello-image.txt");

    const listResponse = await request(`/api/pens/${created.pen.id}/assets`);
    const list = (await listResponse.json()) as { assets: Array<{ id: string }> };
    expect(list.assets).toEqual([{ id: upload.asset.id, penId: created.pen.id, filename: "hello-image.txt", contentType: "text/plain", size: 5, createdAt: expect.any(String), url: upload.asset.url }]);

    const assetResponse = await request(upload.asset.url);
    expect(assetResponse.status).toBe(200);
    expect(assetResponse.headers.get("Content-Type")).toBe("text/plain");
    expect(await assetResponse.text()).toBe("hello");
  });

  it("renames assets without changing their stable URL", async () => {
    const created = await createTestPen("Rename Assets");
    const upload = await uploadTestAsset(created.pen.id, "Original Name.txt");

    const renameResponse = await request(`/api/pens/${created.pen.id}/assets/${upload.asset.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: "Renamed Asset.txt" })
    });
    expect(renameResponse.status).toBe(200);
    const renamed = (await renameResponse.json()) as { asset: { id: string; url: string; filename: string } };
    expect(renamed.asset).toMatchObject({
      id: upload.asset.id,
      url: upload.asset.url,
      filename: "renamed-asset.txt"
    });

    const emptyResponse = await request(`/api/pens/${created.pen.id}/assets/${upload.asset.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: "   " })
    });
    expect(emptyResponse.status).toBe(400);
  });

  it("deletes assets and enforces asset ownership", async () => {
    const owner = await createTestPen("Owner");
    const other = await createTestPen("Other");
    const upload = await uploadTestAsset(owner.pen.id, "owned.txt");

    const wrongPenResponse = await request(`/api/pens/${other.pen.id}/assets/${upload.asset.id}`, { method: "DELETE" });
    expect(wrongPenResponse.status).toBe(404);

    const deleteResponse = await request(`/api/pens/${owner.pen.id}/assets/${upload.asset.id}`, { method: "DELETE" });
    expect(deleteResponse.status).toBe(200);

    const assetResponse = await request(upload.asset.url);
    expect(assetResponse.status).toBe(404);
  });

  it("returns consistent JSON errors", async () => {
    const response = await request("/api/pens/missing");
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: {
        code: "not_found",
        message: "Pen not found."
      }
    });
  });
});

function request(path: string, init?: RequestInit) {
  return worker.fetch(new Request(`https://cfpen.test${path}`, init), env);
}

async function createTestPen(title: string) {
  return (await (
    await request("/api/pens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title })
    })
  ).json()) as { pen: Pen };
}

async function uploadTestAsset(penId: string, filename: string) {
  const form = new FormData();
  form.append("file", new File(["hello"], filename, { type: "text/plain" }));
  return (await (
    await request(`/api/pens/${penId}/assets`, {
      method: "POST",
      body: form
    })
  ).json()) as { asset: { id: string; url: string; filename: string } };
}

class FakeD1 {
  pens = new Map<string, Pen>();
  assets = new Map<string, StoredAsset>();

  prepare(sql: string) {
    return new FakeStatement(this, sql);
  }
}

class FakeStatement {
  private values: unknown[] = [];

  constructor(
    private db: FakeD1,
    private sql: string
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  async all<T>() {
    const results = this.selectRows() as T[];
    return { results, success: true, meta: {} };
  }

  async first<T>() {
    return (this.selectRows()[0] ?? null) as T | null;
  }

  async run() {
    if (this.sql.startsWith("INSERT INTO pens")) {
      const [id, title, slug, html, css, js, createdAt, updatedAt] = this.values as string[];
      this.db.pens.set(id, {
        id,
        title,
        slug,
        html,
        css,
        js,
        created_at: createdAt,
        updated_at: updatedAt,
        deleted_at: null
      });
    } else if (this.sql.startsWith("UPDATE pens SET title")) {
      const [title, html, css, js, updatedAt, id] = this.values as string[];
      const pen = this.db.pens.get(id);
      if (pen && !pen.deleted_at) {
        Object.assign(pen, { title, html, css, js, updated_at: updatedAt });
      }
    } else if (this.sql.startsWith("UPDATE pens SET deleted_at")) {
      const [deletedAt, updatedAt, id] = this.values as string[];
      const pen = this.db.pens.get(id);
      if (pen && !pen.deleted_at) {
        pen.deleted_at = deletedAt;
        pen.updated_at = updatedAt;
      }
    } else if (this.sql.startsWith("INSERT INTO assets")) {
      const [id, penId, r2Key, filename, contentType, size, createdAt] = this.values as [
        string,
        string,
        string,
        string,
        string,
        number,
        string
      ];
      this.db.assets.set(id, {
        id,
        pen_id: penId,
        r2_key: r2Key,
        filename,
        content_type: contentType,
        size,
        created_at: createdAt
      });
    } else if (this.sql.startsWith("UPDATE assets SET filename")) {
      const [filename, id, penId] = this.values as string[];
      const asset = this.db.assets.get(id);
      if (asset && asset.pen_id === penId) {
        asset.filename = filename;
      }
    } else if (this.sql.startsWith("DELETE FROM assets")) {
      const [id, penId] = this.values as string[];
      const asset = this.db.assets.get(id);
      if (asset && asset.pen_id === penId) {
        this.db.assets.delete(id);
      }
    }

    return { success: true, meta: {} };
  }

  private selectRows() {
    if (this.sql.includes("FROM pens WHERE deleted_at IS NULL")) {
      return [...this.db.pens.values()]
        .filter((pen) => !pen.deleted_at)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    }

    if (this.sql.includes("FROM pens WHERE id = ?")) {
      const pen = this.db.pens.get(String(this.values[0]));
      return pen && !pen.deleted_at ? [pen] : [];
    }

    if (this.sql.includes("FROM pens WHERE slug = ?")) {
      const pen = [...this.db.pens.values()].find((candidate) => candidate.slug === this.values[0] && !candidate.deleted_at);
      return pen ? [pen] : [];
    }

    if (this.sql.includes("FROM assets WHERE pen_id = ?")) {
      return [...this.db.assets.values()].filter((asset) => asset.pen_id === this.values[0]);
    }

    if (this.sql.includes("FROM assets WHERE id = ?")) {
      const asset = this.db.assets.get(String(this.values[0]));
      if (!asset) return [];
      if (this.sql.includes("AND pen_id = ?") && asset.pen_id !== this.values[1]) return [];
      return [asset];
    }

    return [];
  }
}

class FakeR2 {
  objects = new Map<string, { body: string; contentType: string }>();

  async put(key: string, value: ReadableStream | string, options?: R2PutOptions) {
    const body = typeof value === "string" ? value : await new Response(value).text();
    const metadata = options?.httpMetadata as R2HTTPMetadata | undefined;
    this.objects.set(key, {
      body,
      contentType: metadata?.contentType ?? "application/octet-stream"
    });
    return null as unknown as R2Object;
  }

  async get(key: string) {
    const object = this.objects.get(key);
    if (!object) return null;
    return {
      body: new Response(object.body).body,
      writeHttpMetadata(headers: Headers) {
        headers.set("Content-Type", object.contentType);
      }
    } as R2ObjectBody;
  }

  async delete(key: string) {
    this.objects.delete(key);
  }
}
