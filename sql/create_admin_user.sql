-- Create admin user for the admin_users table
-- This script creates a valid admin user that works with the current authentication system

-- First, ensure the admin_users table exists
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

-- Insert admin user with the correct credentials
-- Email: admin@startupplatform.com
-- Password: Admin123!
INSERT INTO admin_users (email, password_hash, full_name, role, is_active) 
VALUES (
  'admin@startupplatform.com',
  'Admin123!', -- Simple password storage (matches adminAuth.js logic)
  'Platform Administrator',
  'admin',
  true
) ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Verify the admin user was created
SELECT id, email, full_name, role, is_active, created_at 
FROM admin_users 
WHERE email = 'admin@startupplatform.com';