import "reflect-metadata";
import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./modules/app.module";
import { loadEnv } from "@mindful-mastery/config/index";

const projectRoot = resolve(__dirname, "../../..");
loadDotenv({ path: resolve(projectRoot, ".env"), override: true });

const bootstrap = async (): Promise<void> => {
  const env = loadEnv(process.env);
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  app.enableCors({ origin: true });

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  console.info(`Lesson API listening on port ${env.PORT}`);
};

bootstrap().catch((err: unknown) => {
  console.error("Failed to start API service", err);
  process.exit(1);
});
