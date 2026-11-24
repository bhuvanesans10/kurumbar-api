import { DocumentBuilder, SwaggerCustomOptions } from "@nestjs/swagger";

export const swaggerPath = "api/docs";

export const swaggerDocumentOptions = new DocumentBuilder()
  .setTitle("Kurumbar Backend API")
  .setDescription(
    "API documentation for the Kurumbar Community Platform (Website, Mobile App, and Admin Dashboard).\n\nProtected endpoints require JWT Bearer authentication.",
  )
  .addBearerAuth()
  .build();

export const swaggerSetupOptions: SwaggerCustomOptions = {
  swaggerOptions: {
    persistAuthorization: true,
  },
  customSiteTitle: "Kurumbar API",
};
