import * as dotenv from "dotenv";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

// Load .env.local if present, fallback to .env
dotenv.config({ path: ".env.local" });
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const envOrigins = process.env.CORS_ORIGINS;
  const defaultOrigins = ["http://localhost:5193"];

  const origins = envOrigins
    ? envOrigins
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean)
    : defaultOrigins;

  app.enableCors({ origin: origins });

  await app.listen(process.env.PORT ?? 3020);
}

void bootstrap().catch((err) => {
  console.error("Fatal bootstrap error", err);
});
