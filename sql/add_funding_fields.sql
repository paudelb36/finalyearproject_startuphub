-- Add funding fields to startup_profiles table
ALTER TABLE startup_profiles 
ADD COLUMN funding_stage funding_stage DEFAULT 'pre_seed',
ADD COLUMN funding_goal DECIMAL(15,2),
ADD COLUMN funding_raised DECIMAL(15,2) DEFAULT 0;

-- Update existing records to have default funding_stage
UPDATE startup_profiles 
SET funding_stage = 'pre_seed' 
WHERE funding_stage IS NULL;

-- Add RLS policies for startup_updates table
CREATE POLICY "Users can view startup updates" ON startup_updates
  FOR SELECT USING (true);

CREATE POLICY "Startup owners can insert their updates" ON startup_updates
  FOR INSERT WITH CHECK (
    startup_id IN (
      SELECT id FROM startup_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Startup owners can update their updates" ON startup_updates
  FOR UPDATE USING (
    startup_id IN (
      SELECT id FROM startup_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Startup owners can delete their updates" ON startup_updates
  FOR DELETE USING (
    startup_id IN (
      SELECT id FROM startup_profiles WHERE user_id = auth.uid()
    )
  );

-- Enable RLS on startup_updates table
ALTER TABLE startup_updates ENABLE ROW LEVEL SECURITY;