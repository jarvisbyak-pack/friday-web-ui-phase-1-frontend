import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";

const here = dirname(fileURLToPath(import.meta.url));
const migrationPath = join(here, "../../migrations/001_initial.sql");

export async function migrate(): Promise<void> {
  const sql = await readFile(migrationPath, "utf8");
  await pool.query(sql);
}
