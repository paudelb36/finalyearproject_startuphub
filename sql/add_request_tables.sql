-- Add mentorship and investment request tables to support the role-based system

-- Mentorship requests table
CREATE TABLE mentorship_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  startup_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  mentor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  response_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(startup_id, mentor_id)
);

-- Investment requests table
CREATE TABLE investment_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  startup_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  investor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  pitch_deck_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  response_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(startup_id, investor_id)
);

-- Update the existing connections table to use proper column names
ALTER TABLE connections RENAME COLUMN recipient_id TO target_id;

-- Add indexes for better performance
CREATE INDEX idx_mentorship_requests_startup_id ON mentorship_requests(startup_id);
CREATE INDEX idx_mentorship_requests_mentor_id ON mentorship_requests(mentor_id);
CREATE INDEX idx_mentorship_requests_status ON mentorship_requests(status);
CREATE INDEX idx_investment_requests_startup_id ON investment_requests(startup_id);
CREATE INDEX idx_investment_requests_investor_id ON investment_requests(investor_id);
CREATE INDEX idx_investment_requests_status ON investment_requests(status);

-- Enable RLS for new tables
ALTER TABLE mentorship_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for mentorship requests
CREATE POLICY "Users can view their own mentorship requests" ON mentorship_requests 
  FOR SELECT USING (auth.uid() = startup_id OR auth.uid() = mentor_id);

CREATE POLICY "Startups can create mentorship requests" ON mentorship_requests 
  FOR INSERT WITH CHECK (auth.uid() = startup_id);

CREATE POLICY "Users can update their own mentorship requests" ON mentorship_requests 
  FOR UPDATE USING (auth.uid() = startup_id OR auth.uid() = mentor_id);

-- RLS policies for investment requests
CREATE POLICY "Users can view their own investment requests" ON investment_requests 
  FOR SELECT USING (auth.uid() = startup_id OR auth.uid() = investor_id);

CREATE POLICY "Startups can create investment requests" ON investment_requests 
  FOR INSERT WITH CHECK (auth.uid() = startup_id);

CREATE POLICY "Users can update their own investment requests" ON investment_requests 
  FOR UPDATE USING (auth.uid() = startup_id OR auth.uid() = investor_id);

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_mentorship_requests_updated_at 
  BEFORE UPDATE ON mentorship_requests 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investment_requests_updated_at 
  BEFORE UPDATE ON investment_requests 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add notification triggers for new requests
CREATE OR REPLACE FUNCTION notify_new_mentorship_request()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, content, related_id)
  VALUES (
    NEW.mentor_id,
    'mentorship_request',
    'New Mentorship Request',
    'You have received a new mentorship request',
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_new_investment_request()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, content, related_id)
  VALUES (
    NEW.investor_id,
    'investment_request',
    'New Investment Request',
    'You have received a new investment request',
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_new_mentorship_request
  AFTER INSERT ON mentorship_requests
  FOR EACH ROW EXECUTE FUNCTION notify_new_mentorship_request();

CREATE TRIGGER trigger_notify_new_investment_request
  AFTER INSERT ON investment_requests
  FOR EACH ROW EXECUTE FUNCTION notify_new_investment_request();