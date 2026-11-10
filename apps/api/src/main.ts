import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./modules/app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  const openApi = new DocumentBuilder()
    .setTitle("MEGAP Clinic OS API")
    .setDescription("Versioned API for MEGAP Clinic OS")
    .setVersion("1.0")
    .build();
  SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, openApi));

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port, "0.0.0.0");
}

void bootstrap();
