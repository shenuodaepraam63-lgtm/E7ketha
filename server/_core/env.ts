import "dotenv/config";

function validPostgresUrl(value: string) {
  try { return /^postgres(?:ql)?:\/\//i.test(value) && Boolean(new URL(value).hostname); } catch { return false; }
}
const configuredDatabaseUrl = process.env.SUPABASE_DATABASE_URL ?? process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? '';

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: validPostgresUrl(configuredDatabaseUrl) ? configuredDatabaseUrl : "",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY ?? "",
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY ?? "",
  supabaseJwksUrl: process.env.SUPABASE_JWKS_URL ?? "",
  supabaseAdminEmails: process.env.SUPABASE_ADMIN_EMAILS ?? "",
  cloudinaryUrl: process.env.CLOUDINARY_URL ?? "",
  shopifyStoreDomain: process.env.SHOPIFY_STORE_DOMAIN ?? "",
  shopifyStorefrontApiAccessToken: process.env.SHOPIFY_STOREFRONT_API_ACCESS_TOKEN ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
};
