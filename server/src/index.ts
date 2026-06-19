import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { existsSync } from "node:fs";
import { createDatabase } from "./db/database.js";
import { runMigrations } from "./db/migrations.js";
import { createRepository } from "./db/repository.js";
import { paths } from "./paths.js";
import { registerApiRoutes } from "./routes/api.js";

const app = Fastify({
  logger: true
});

const db = createDatabase();
runMigrations(db);
const repo = createRepository(db);

await app.register(cors, {
  origin: true
});

await registerApiRoutes(app, repo);

if (existsSync(paths.clientDistDir)) {
  await app.register(fastifyStatic, {
    root: paths.clientDistDir,
    prefix: "/"
  });

  app.setNotFoundHandler(async (_request, reply) => {
    await reply.sendFile("index.html");
  });
}

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
