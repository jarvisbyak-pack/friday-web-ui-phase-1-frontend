import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { config } from "../config.js";
import { pool } from "../db/pool.js";

export type StoredFile = {
  id: string;
  userId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  createdAt: string;
};

type FileRow = {
  id: string;
  user_id: string;
  name: string;
  mime_type: string;
  size_bytes: string;
  storage_path: string;
  sha256: string;
  created_at: Date;
};

function toFile(row: FileRow): StoredFile {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    sha256: row.sha256,
    createdAt: row.created_at.toISOString()
  };
}

function safeStoragePath(id: string): string {
  const root = resolve(config.FILE_STORAGE_DIR);
  const target = resolve(root, `${id}.bin`);
  if (!target.startsWith(root + "/") && !target.startsWith(root + "\\")) {
    throw new Error("Invalid storage path.");
  }
  return target;
}

export class FileService {
  async list(userId: string, limit = 100): Promise<StoredFile[]> {
    const { rows } = await pool.query<FileRow>(
      `SELECT id, user_id, name, mime_type, size_bytes, storage_path, sha256, created_at
       FROM files WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [userId, Math.min(Math.max(Math.trunc(limit), 1), 100)]
    );
    return rows.map(toFile);
  }

  async save(
    userId: string,
    name: string,
    mimeType: string,
    content: Buffer
  ): Promise<StoredFile> {
    if (content.length > config.FILE_MAX_BYTES) {
      throw new Error(`File exceeds the ${config.FILE_MAX_BYTES} byte limit.`);
    }

    const id = randomUUID();
    const storagePath = safeStoragePath(id);
    const sha256 = createHash("sha256").update(content).digest("hex");

    await mkdir(dirname(storagePath), { recursive: true });
    await writeFile(storagePath, content, { flag: "wx" });

    try {
      const { rows } = await pool.query<FileRow>(
        `INSERT INTO files (id, user_id, name, mime_type, size_bytes, storage_path, sha256)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, user_id, name, mime_type, size_bytes, storage_path, sha256, created_at`,
        [id, userId, name.trim().slice(0, 255), mimeType.trim().slice(0, 255), content.length, storagePath, sha256]
      );
      return toFile(rows[0]!);
    } catch (error) {
      await rm(storagePath, { force: true });
      throw error;
    }
  }

  async read(userId: string, id: string): Promise<{ file: StoredFile; content: Buffer } | undefined> {
    const { rows } = await pool.query<FileRow>(
      `SELECT id, user_id, name, mime_type, size_bytes, storage_path, sha256, created_at
       FROM files WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    const row = rows[0];
    if (!row) return undefined;
    const content = await readFile(safeStoragePath(row.id));
    return { file: toFile(row), content };
  }
}
