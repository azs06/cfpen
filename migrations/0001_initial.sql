CREATE TABLE IF NOT EXISTS pens (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  html TEXT NOT NULL DEFAULT '',
  css TEXT NOT NULL DEFAULT '',
  js TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_pens_updated_at ON pens(updated_at);
CREATE INDEX IF NOT EXISTS idx_pens_deleted_at ON pens(deleted_at);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  pen_id TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (pen_id) REFERENCES pens(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_assets_pen_id ON assets(pen_id);
