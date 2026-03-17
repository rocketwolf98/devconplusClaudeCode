-- ── TRIGGER 1: Create profile row when a new auth user is created ─────────────
-- Also awards the 500pt signup bonus. Replaces the award-signup-bonus Edge Function.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    school_or_company,
    role,
    total_points
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'DEVCON Member'),
    NEW.email,
    NEW.raw_user_meta_data->>'school_or_company',
    'member',
    0
  );

  -- Award 500pt signup bonus
  INSERT INTO public.point_transactions (user_id, amount, description, source)
  VALUES (NEW.id, 500, 'Welcome to DEVCON+!', 'signup');

  UPDATE public.profiles
    SET total_points = 500
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── TRIGGER 2: Auto-approve registration when event.requires_approval = false ──
-- Runs BEFORE INSERT so it can mutate NEW directly (no second UPDATE needed).
-- Replaces the auto-approve-registration Edge Function.

CREATE OR REPLACE FUNCTION public.handle_registration_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requires_approval boolean;
BEGIN
  SELECT requires_approval
    INTO v_requires_approval
  FROM public.events
  WHERE id = NEW.event_id;

  IF NOT v_requires_approval THEN
    NEW.status        := 'approved';
    NEW.qr_code_token := 'DCN-' || upper(substring(gen_random_uuid()::text FROM 1 FOR 8));
    NEW.approved_at   := now();
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_registration_insert
  BEFORE INSERT ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.handle_registration_insert();
