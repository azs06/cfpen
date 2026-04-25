import type { Asset, Pen } from "./types";

type ApiErrorBody = {
  error?: {
    code: string;
    message: string;
  };
};

export async function listPens(): Promise<Pen[]> {
  const data = await request<{ pens: Pen[] }>("/api/pens");
  return data.pens;
}

export async function createPen(input: Partial<Pick<Pen, "title" | "html" | "css" | "js">> = {}): Promise<Pen> {
  const data = await request<{ pen: Pen }>("/api/pens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  return data.pen;
}

export async function getPen(id: string): Promise<Pen> {
  const data = await request<{ pen: Pen }>(`/api/pens/${id}`);
  return data.pen;
}

export async function updatePen(id: string, input: Pick<Pen, "title" | "html" | "css" | "js">): Promise<Pen> {
  const data = await request<{ pen: Pen }>(`/api/pens/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  return data.pen;
}

export async function deletePen(id: string): Promise<void> {
  await request(`/api/pens/${id}`, { method: "DELETE" });
}

export async function forkPen(id: string): Promise<Pen> {
  const data = await request<{ pen: Pen }>(`/api/pens/${id}/fork`, { method: "POST" });
  return data.pen;
}

export async function getSharedPen(slug: string): Promise<{ pen: Pen; assets: Asset[] }> {
  return request(`/api/shared/${slug}`);
}

export async function uploadAsset(penId: string, file: File): Promise<Asset> {
  const form = new FormData();
  form.append("file", file);
  const data = await request<{ asset: Asset }>(`/api/pens/${penId}/assets`, {
    method: "POST",
    body: form
  });
  return data.asset;
}

export async function renameAsset(penId: string, assetId: string, filename: string): Promise<Asset> {
  const data = await request<{ asset: Asset }>(`/api/pens/${penId}/assets/${assetId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename })
  });
  return data.asset;
}

export async function deleteAsset(penId: string, assetId: string): Promise<void> {
  await request(`/api/pens/${penId}/assets/${assetId}`, { method: "DELETE" });
}

export async function listPenAssets(penId: string): Promise<Asset[]> {
  const data = await request<{ assets: Asset[] }>(`/api/pens/${penId}/assets`);
  return data.assets;
}

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    let body: ApiErrorBody = {};
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      // Ignore non-JSON errors from development middleware.
    }

    throw new Error(body.error?.message ?? `Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}
