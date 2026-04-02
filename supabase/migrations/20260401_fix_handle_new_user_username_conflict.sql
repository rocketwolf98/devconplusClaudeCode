-- supabase/migrations/20260401_fix_handle_new_user_username_conflict.sql
--
-- Fix: handle_new_user() trigger crashes with "Database error saving new user"
-- when profiles.username has a UNIQUE violation. ON CONFLICT (id) only catches
-- id conflicts, not username conflicts.
--
-- Solution: add ON CONFLICT handling for username by falling back to NULL username
-- (user can set it later via ProfileEdit). Also wrap the INSERT in a nested BEGIN
-- so any unexpected constraint error logs and returns NEW instead of aborting the
-- entire auth.users INSERT transaction.
--
-- DEPLOY: paste into Supabase SQL editor

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chapter_id uuid;
  v_username   text;
BEGIN
  -- Safely parse chapter_id from metadata; any parse failure → NULL → Manila fallback
  BEGIN
    v_chapter_id := (NEW.raw_user_meta_data->>'chapter_id')::uuid;
  EXCEPTION WHEN others THEN
    v_chapter_id := NULL;
  END;

  IF v_chapter_id IS NULL THEN
    SELECT id INTO v_chapter_id FROM chapters WHERE name = 'Manila' LIMIT 1;
  END IF;

  v_username := NEW.raw_user_meta_data->>'username';

  -- First attempt: insert with requested username
  BEGIN
    INSERT INTO public.profiles (
      id, email, full_name, username, school_or_company,
      chapter_id, role, spendable_points, lifetime_points
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      v_username,
      NEW.raw_user_meta_data->>'school_or_company',
      v_chapter_id,
      'member',
      0,
      0
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION
    WHEN unique_violation THEN
      -- Username taken — insert without username (user sets it in ProfileEdit)
      INSERT INTO public.profiles (
        id, email, full_name, username, school_or_company,
        chapter_id, role, spendable_points, lifetime_points
      ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NULL,
        NEW.raw_user_meta_data->>'school_or_company',
        v_chapter_id,
        'member',
        0,
        0
      )
      ON CONFLICT (id) DO NOTHING;
    WHEN others THEN
      -- Any other error: log and continue — don't abort auth.users INSERT
      RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;
