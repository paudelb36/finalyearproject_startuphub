-- Add event targeting functionality
-- This migration adds the ability to restrict events to specific user roles

-- Add target_audience field to events table
ALTER TABLE events 
ADD COLUMN target_audience TEXT[] DEFAULT ARRAY['startup', 'mentor', 'investor'] 
CHECK (target_audience <@ ARRAY['startup', 'mentor', 'investor', 'all']);

-- Add comment for clarity
COMMENT ON COLUMN events.target_audience IS 'Array of user roles that can register for this event. Use ["all"] for events open to everyone.';

-- Update existing events to be open to all roles by default
UPDATE events SET target_audience = ARRAY['startup', 'mentor', 'investor'] WHERE target_audience IS NULL;

-- Add index for better query performance
CREATE INDEX idx_events_target_audience ON events USING GIN (target_audience);

-- Add function to check if user can register for event
CREATE OR REPLACE FUNCTION can_user_register_for_event(user_role TEXT, event_target_audience TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  -- If event is open to all, allow registration
  IF 'all' = ANY(event_target_audience) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user's role is in the target audience
  RETURN user_role = ANY(event_target_audience);
END;
$$ LANGUAGE plpgsql;

-- Add RLS policy for event registrations based on target audience
CREATE POLICY "Users can only register for events targeting their role" ON event_registrations
  FOR INSERT WITH CHECK (
    can_user_register_for_event(
      (SELECT role FROM profiles WHERE id = user_id),
      (SELECT target_audience FROM events WHERE id = event_id)
    )
  );