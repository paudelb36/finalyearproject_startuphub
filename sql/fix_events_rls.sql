-- Complete RLS fix for events and event_registrations tables
-- Run this in Supabase SQL Editor for cloud database

-- First, disable RLS to clean up any problematic policies
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can only register for events targeting their role" ON event_registrations;
DROP POLICY IF EXISTS "Authenticated users can view events" ON events;
DROP POLICY IF EXISTS "Users can view their own registrations" ON event_registrations;
DROP POLICY IF EXISTS "Users can register for events targeting their role" ON event_registrations;
DROP POLICY IF EXISTS "Users can update their own registrations" ON event_registrations;
DROP POLICY IF EXISTS "Admins can manage all events" ON events;
DROP POLICY IF EXISTS "Admins can view all registrations" ON event_registrations;
DROP POLICY IF EXISTS "Allow authenticated users to view events" ON events;
DROP POLICY IF EXISTS "Allow users to view own registrations" ON event_registrations;
DROP POLICY IF EXISTS "Allow users to register for events" ON event_registrations;
DROP POLICY IF EXISTS "Allow users to update own registrations" ON event_registrations;
DROP POLICY IF EXISTS "Allow admins to manage events" ON events;
DROP POLICY IF EXISTS "Allow admins to view all registrations" ON event_registrations;
DROP POLICY IF EXISTS "events_select_policy" ON events;
DROP POLICY IF EXISTS "registrations_select_policy" ON event_registrations;
DROP POLICY IF EXISTS "registrations_insert_policy" ON event_registrations;
DROP POLICY IF EXISTS "registrations_update_policy" ON event_registrations;
DROP POLICY IF EXISTS "events_insert_policy" ON events;
DROP POLICY IF EXISTS "events_update_policy" ON events;

-- Now enable RLS on both tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- Create simple, working policies

-- Events policies
CREATE POLICY "events_public_read" ON events
  FOR SELECT USING (true);

CREATE POLICY "events_auth_write" ON events
  FOR ALL USING (auth.role() = 'authenticated');

-- Event registrations policies
CREATE POLICY "registrations_own_read" ON event_registrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "registrations_own_write" ON event_registrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "registrations_own_update" ON event_registrations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "registrations_own_delete" ON event_registrations
  FOR DELETE USING (auth.uid() = user_id);