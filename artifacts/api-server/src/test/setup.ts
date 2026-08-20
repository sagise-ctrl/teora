// Runs BEFORE test files are evaluated — sets env vars before modules load
process.env.SUPABASE_JWT_SECRET = "test-secret-key-for-testing-only-32chars";
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.NODE_ENV = "test";
process.env.UPLOAD_DIR = "/tmp/test-uploads";
process.env.EXPORT_DIR = "/tmp/test-exports";
process.env.WEBHOOK_SECRET = "test-webhook-secret";
