-- supabase/migrations/20260419_interest_quiz_gin_fix.sql
-- Fix GIN indexes to support && overlap operator (intarray extension required)

CREATE EXTENSION IF NOT EXISTS intarray;

DROP INDEX IF EXISTS profiles_interests_gin;
DROP INDEX IF EXISTS profiles_tech_stack_gin;
DROP INDEX IF EXISTS profiles_community_roles_gin;

CREATE INDEX profiles_interests_gin       ON profiles USING GIN (interests gin__int_ops);
CREATE INDEX profiles_tech_stack_gin      ON profiles USING GIN (tech_stack gin__int_ops);
CREATE INDEX profiles_community_roles_gin ON profiles USING GIN (community_roles gin__int_ops);
