-- Startup Platform Database Schema
-- This schema supports a comprehensive platform for startups, mentors, and investors

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types
CREATE TYPE user_role AS ENUM ('startup', 'mentor', 'investor', 'admin', 'user');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'banned', 'pending');
CREATE TYPE startup_stage AS ENUM ('idea', 'mvp', 'early_stage', 'growth', 'scale', 'exit');
CREATE TYPE funding_stage AS ENUM ('pre_seed', 'seed', 'series_a', 'series_b', 'series_c', 'series_d', 'ipo', 'acquired');
CREATE TYPE event_type AS ENUM ('webinar', 'workshop', 'pitch_event', 'networking', 'conference', 'meetup');
CREATE TYPE event_status AS ENUM ('draft', 'published', 'ongoing', 'completed', 'cancelled');
CREATE TYPE connection_status AS ENUM ('pending', 'accepted', 'declined', 'blocked');
CREATE TYPE message_type AS ENUM ('text', 'image', 'file', 'system');
CREATE TYPE notification_type AS ENUM ('message', 'connection_request', 'event_invite', 'application_status', 'system', 'payment');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE content_flag_status AS ENUM ('pending', 'approved', 'removed', 'dismissed');

-- User profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('startup', 'mentor', 'investor', 'admin')),
  location TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Startup profiles
CREATE TABLE startup_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  industry TEXT,
  stage TEXT CHECK (stage IN ('idea', 'prototype', 'mvp', 'early_revenue', 'growth', 'scale')),
  location TEXT,
  website_url TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  pitch_deck_url TEXT,
  founded_date DATE,
  employee_count INTEGER,
  funding_stage funding_stage DEFAULT 'pre_seed',
  funding_goal DECIMAL(15,2),
  funding_raised DECIMAL(15,2) DEFAULT 0,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team members for startups
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  startup_id UUID REFERENCES startup_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  bio TEXT,
  linkedin_url TEXT,
  image_url TEXT,
  is_founder BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mentor profiles
CREATE TABLE mentor_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  expertise_tags TEXT[],
  years_experience INTEGER,
  availability TEXT CHECK (availability IN ('available', 'busy', 'unavailable')),
  is_paid BOOLEAN DEFAULT FALSE,
  hourly_rate DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  linkedin_url TEXT,
  company TEXT,
  job_title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Investor profiles
CREATE TABLE investor_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  investment_stage TEXT[],
  ticket_size_min INTEGER,
  ticket_size_max INTEGER,
  sectors TEXT[],
  geographic_focus TEXT[],
  fund_name TEXT,
  fund_size TEXT,
  portfolio_companies INTEGER,
  linkedin_url TEXT,
  website_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Startup updates/posts
CREATE TABLE startup_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  startup_id UUID REFERENCES startup_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  images TEXT[],
  milestone_type TEXT CHECK (milestone_type IN ('funding', 'product', 'team', 'partnership', 'revenue', 'other')),
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events (pitch events, webinars, etc.)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizer_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT CHECK (event_type IN ('pitch_event', 'webinar', 'networking', 'workshop')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  location TEXT,
  is_virtual BOOLEAN DEFAULT FALSE,
  google_meet_link TEXT,
  max_participants INTEGER,
  registration_deadline TIMESTAMP WITH TIME ZONE,
  is_public BOOLEAN DEFAULT TRUE,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event registrations
CREATE TABLE event_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'cancelled')),
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Pitch applications (for pitch events)
CREATE TABLE pitch_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  startup_id UUID REFERENCES startup_profiles(id) ON DELETE CASCADE,
  pitch_deck_url TEXT,
  application_answers JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(event_id, startup_id)
);

-- Connections between users
CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  connection_type TEXT CHECK (connection_type IN ('startup_startup', 'startup_mentor', 'startup_investor', 'mentor_investor')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, recipient_id)
);

-- Messages between users
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations (to group messages)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_1 UUID REFERENCES profiles(id) ON DELETE CASCADE,
  participant_2 UUID REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(participant_1, participant_2)
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('message', 'connection_request', 'connection_accepted', 'event_invite', 'application_status', 'mention')),
  title TEXT NOT NULL,
  content TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  related_id UUID, -- Can reference events, messages, connections, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment transactions (for paid mentorship)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentor_id UUID REFERENCES mentor_profiles(id) ON DELETE CASCADE,
  startup_id UUID REFERENCES startup_profiles(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled')),
  session_duration INTEGER, -- in minutes
  session_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Saved searches
CREATE TABLE saved_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  search_type TEXT CHECK (search_type IN ('startups', 'mentors', 'investors')),
  search_params JSONB NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content moderation
CREATE TABLE content_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flagger_id UUID REFERENCES profiles(id),
  content_type TEXT CHECK (content_type IN ('profile', 'update', 'message', 'event')),
  content_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_startup_profiles_slug ON startup_profiles(slug);
CREATE INDEX idx_startup_profiles_industry ON startup_profiles(industry);
CREATE INDEX idx_startup_profiles_stage ON startup_profiles(stage);
CREATE INDEX idx_mentor_profiles_availability ON mentor_profiles(availability);
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_messages_sender_recipient ON messages(sender_id, recipient_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_connections_status ON connections(status);

-- Row Level Security (RLS) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE startup_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (can be expanded)
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can view public profiles" ON profiles FOR SELECT USING (true);

-- Role-specific profile policies
CREATE POLICY "Users can view startup profiles" ON startup_profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own startup profile" ON startup_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own startup profile" ON startup_profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view mentor profiles" ON mentor_profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own mentor profile" ON mentor_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own mentor profile" ON mentor_profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view investor profiles" ON investor_profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own investor profile" ON investor_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own investor profile" ON investor_profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own messages" ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_startup_profiles_updated_at BEFORE UPDATE ON startup_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mentor_profiles_updated_at BEFORE UPDATE ON mentor_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_investor_profiles_updated_at BEFORE UPDATE ON investor_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();