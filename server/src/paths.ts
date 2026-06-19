import { resolve } from "node:path";

const serverRoot = process.cwd();
const projectRoot = resolve(serverRoot, "..");

export const paths = {
  serverRoot,
  projectRoot,
  dataDir: resolve(projectRoot, "data"),
  databaseFile: resolve(projectRoot, "data", "tinctures.sqlite"),
  migrationsDir: resolve(serverRoot, "migrations"),
  clientDistDir: resolve(projectRoot, "client", "dist")
};
