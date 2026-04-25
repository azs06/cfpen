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

export type Asset = {
  id: string;
  penId: string;
  filename: string;
  contentType: string;
  size: number;
  createdAt: string;
  url: string;
};

export type SaveState = "saved" | "dirty" | "saving" | "error";
