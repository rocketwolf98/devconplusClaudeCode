-- Add claim_pin column: 6-digit numeric string, unique, auto-generated on INSERT
ALTER TABLE reward_redemptions
  ADD COLUMN IF NOT EXISTS claim_pin varchar(6);

-- Trigger function: generates a unique 6-digit PIN on every new redemption
CREATE OR REPLACE FUNCTION generate_claim_pin()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_pin varchar(6);
  v_attempts integer := 0;
BEGIN
  -- Retry until a unique PIN is found (collision extremely unlikely but handled)
  LOOP
    v_pin := lpad(floor(random() * 1000000)::int::text, 6, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM reward_redemptions WHERE claim_pin = v_pin
    );
    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'Could not generate unique claim PIN after 10 attempts';
    END IF;
  END LOOP;
  NEW.claim_pin := v_pin;
  RETURN NEW;
END;
$$;

-- Attach trigger to reward_redemptions INSERT
DROP TRIGGER IF EXISTS trg_generate_claim_pin ON reward_redemptions;
CREATE TRIGGER trg_generate_claim_pin
  BEFORE INSERT ON reward_redemptions
  FOR EACH ROW
  EXECUTE FUNCTION generate_claim_pin();
