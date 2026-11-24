export const excludedControllers = [
  "HealthController",
  "WebAuthController",
  "MobileAuthController",
  "SuperAuthController",
  "PaymentGatewayWebhooksController",
  "InternalDocumentUpdateWebhooksController",
  "SupportChatGenieBotWebhooksController",
  "DemoEnvironmentWebhooksController",
  "ServiceInfoController",
  "MerchantOnboardingWebhooksController",
  "AutoAgenticApprovalWebhooksController",
  "DocumentVerificationWebhookController",
  "AppQrRedirectsController",
  "RestaurantInternalController",
  "MenuAssistanceController",
  "RestaurantInvoicesAndDocumentsWebhookController",
  "McpController",
  "InfraController",
  "PlivoWebhooksController",
  "LiveKitWebhooksController",
  "PrometheusController",
  "DigiLockerWebhooksController",
];

export function shouldExcludeLog(controllerName: string): boolean {
  if (!controllerName) return false;
  return excludedControllers.includes(controllerName);
}

export const excludedRoutes = ["/health", "/_health", "/ping", "/metrics"];

export function shouldExcludeLogByUrl(url: string): boolean {
  if (!url) return false;
  return excludedRoutes.some((route) => url.includes(route));
}
