import type Database from "better-sqlite3";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { paths } from "../paths.js";

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = new Set(
    db.prepare("SELECT id FROM migrations").all().map((row) => (row as { id: string }).id)
  );

  const files = readdirSync(paths.migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  const insertMigration = db.prepare("INSERT INTO migrations (id, applied_at) VALUES (?, ?)");

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = readFileSync(join(paths.migrationsDir, file), "utf8");
    const apply = db.transaction(() => {
      db.exec(sql);
      insertMigration.run(file, new Date().toISOString());
    });

    apply();
  }
}

