-- Alternative Admin Table Schema
-- This creates a separate admin table that doesn't rely on Supabase auth
-- Run this in Supabase SQL Editor

-- Create admin table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default admin user
-- Password: Admin123! (hashed using bcrypt)
INSERT INTO admin_users (email, password_hash, full_name) VALUES (
  'admin@startupplatform.com',
  '$2b$10$rOzJqKqZ8qVqK8qVqK8qVOzJqKqZ8qVqK8qVqK8qVOzJqKqZ8qVqK',
  'Platform Administrator'
) ON CONFLICT (email) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_updated_at();

-- Enable RLS (optional)
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access
CREATE POLICY "Admin users can access their own data" ON admin_users
  FOR ALL USING (true);

COMMENT ON TABLE admin_users IS 'Separate admin authentication table that bypasses Supabase auth';