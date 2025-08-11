-- Admin User Seeding Script
-- Run this script in Supabase SQL Editor to create a default admin user

-- First, create the admin user in auth.users table
-- Note: You'll need to replace the UUID with a generated one
-- You can generate a UUID at: https://www.uuidgenerator.net/

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'admin@startupplatform.com',
  crypt('Admin123!', gen_salt('bf')), -- Password: Admin123!
  NOW(),
  NOW(),
  NOW(),
  'authenticated',
  'authenticated',
  '',
  '',
  ''
);

-- Create the admin profile
INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  bio,
  location,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'admin@startupplatform.com',
  'Platform Administrator',
  'admin',
  'System administrator for the startup platform',
  'Global',
  NOW(),
  NOW()
);

-- Alternative method using Supabase Auth API (recommended)
-- If the above doesn't work, use this approach:

/*
To create admin user via Supabase Dashboard:
1. Go to Authentication > Users in Supabase Dashboard
2. Click "Add User"
3. Email: admin@startupplatform.com
4. Password: Admin123!
5. Auto Confirm User: Yes
6. Then run this SQL to update the profile:

UPDATE profiles 
SET role = 'admin', 
    full_name = 'Platform Administrator',
    bio = 'System administrator for the startup platform',
    location = 'Global'
WHERE email = 'admin@startupplatform.com';
*/

-- Admin Credentials for Reference:
-- Email: admin@startupplatform.com
-- Password: Admin123!
-- Role: admin