-- Add custom_form_schema to events (JSONB array of CustomFormField objects)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS custom_form_schema jsonb DEFAULT NULL;

-- Add form_responses to event_registrations (JSONB keyed by CustomFormField.id)
ALTER TABLE event_registrations
  ADD COLUMN IF NOT EXISTS form_responses jsonb DEFAULT NULL;
