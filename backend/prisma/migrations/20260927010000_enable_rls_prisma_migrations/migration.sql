-- Supabase: _prisma_migrations lives in the public schema too, so hide it from the Data API.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
