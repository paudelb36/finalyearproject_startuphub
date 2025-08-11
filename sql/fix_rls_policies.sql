-- Fix Missing RLS Policies for Startup Platform
-- Run these commands in your Supabase SQL Editor to fix the signup issue

-- Add missing INSERT policy for profiles table
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Add policies for startup_profiles table
CREATE POLICY "Users can view startup profiles" ON startup_profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own startup profile" ON startup_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own startup profile" ON startup_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Add policies for mentor_profiles table
CREATE POLICY "Users can view mentor profiles" ON mentor_profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own mentor profile" ON mentor_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own mentor profile" ON mentor_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Add policies for investor_profiles table
CREATE POLICY "Users can view investor profiles" ON investor_profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own investor profile" ON investor_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own investor profile" ON investor_profiles FOR UPDATE USING (auth.uid() = user_id);

-- After running these commands, the signup process should work correctly
-- and startup profiles will be created in the startup_profiles table