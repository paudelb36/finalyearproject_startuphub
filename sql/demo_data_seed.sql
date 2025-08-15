-- Demo Data Seed for Recommendation System Presentation
-- Creates 3 interconnected users (startup, mentor, investor) with relationships
-- This data demonstrates both graph-based and attribute-based recommendation algorithms

-- First, we need to insert into auth.users (this would normally be done through Supabase Auth)
-- For demo purposes, we'll use placeholder UUIDs that you'll need to replace with actual auth user IDs

-- Demo User IDs (replace these with actual Supabase Auth user IDs)
-- Startup User: 'aaaaaaaa-bbbb-cccc-dddd-111111111111'
-- Mentor User:  'aaaaaaaa-bbbb-cccc-dddd-222222222222' 
-- Investor User:'aaaaaaaa-bbbb-cccc-dddd-333333333333'

-- =============================================
-- 1. USER PROFILES
-- =============================================

-- Insert basic profiles
INSERT INTO profiles (id, email, full_name, avatar_url, role, location, bio, created_at, updated_at) VALUES
(
  'aaaaaaaa-bbbb-cccc-dddd-111111111111',
  'alex.chen@techflow.com',
  'Alex Chen',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
  'startup',
  'San Francisco, CA',
  'Co-founder and CEO of TechFlow Solutions. Building the future of financial technology with AI-powered payment processing.',
  NOW() - INTERVAL '6 months',
  NOW() - INTERVAL '1 week'
),
(
  'aaaaaaaa-bbbb-cccc-dddd-222222222222',
  'sarah.chen@stripe.com',
  'Sarah Chen',
  'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
  'mentor',
  'San Francisco, CA',
  'Former VP of Product at Stripe. 12+ years experience in FinTech, scaling teams, and fundraising. Passionate about helping early-stage startups.',
  NOW() - INTERVAL '2 years',
  NOW() - INTERVAL '2 days'
),
(
  'aaaaaaaa-bbbb-cccc-dddd-333333333333',
  'michael.rodriguez@bayareavc.com',
  'Michael Rodriguez',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
  'investor',
  'San Francisco, CA',
  'Partner at Bay Area Ventures. Focus on FinTech and B2B SaaS startups. 25+ portfolio companies with 3 successful exits.',
  NOW() - INTERVAL '3 years',
  NOW() - INTERVAL '1 day'
);

-- =============================================
-- 2. ROLE-SPECIFIC PROFILES
-- =============================================

-- Startup Profile
INSERT INTO startup_profiles (
  user_id, company_name, tagline, description, industry, stage, location, 
  website_url, logo_url, cover_image_url, founded_date, employee_count, 
  funding_stage, funding_goal, funding_raised, slug, created_at, updated_at
) VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-111111111111',
  'TechFlow Solutions',
  'AI-powered payment processing for the next generation',
  'TechFlow Solutions is revolutionizing payment processing with advanced AI algorithms that reduce fraud by 95% while increasing transaction speed by 300%. Our platform serves over 500 merchants and processes $2M+ monthly volume.',
  'FinTech',
  'mvp',
  'San Francisco, CA',
  'https://techflow.com',
  'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=400&fit=crop',
  '2023-01-15',
  8,
  'seed',
  2000000,
  500000,
  'techflow-solutions',
  NOW() - INTERVAL '6 months',
  NOW() - INTERVAL '1 week'
);

-- Team Members for Startup
INSERT INTO team_members (startup_id, name, role, bio, linkedin_url, image_url, is_founder, created_at) VALUES
(
  (SELECT id FROM startup_profiles WHERE user_id = 'aaaaaaaa-bbbb-cccc-dddd-111111111111'),
  'Alex Chen',
  'CEO & Co-founder',
  'Former software engineer at Google. Stanford CS graduate with expertise in machine learning and payments.',
  'https://linkedin.com/in/alexchen',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
  true,
  NOW() - INTERVAL '6 months'
),
(
  (SELECT id FROM startup_profiles WHERE user_id = 'aaaaaaaa-bbbb-cccc-dddd-111111111111'),
  'Jessica Liu',
  'CTO & Co-founder',
  'Former Principal Engineer at Stripe. MIT graduate with 8 years experience in financial infrastructure.',
  'https://linkedin.com/in/jessicaliu',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
  true,
  NOW() - INTERVAL '6 months'
);

-- Mentor Profile
INSERT INTO mentor_profiles (
  user_id, expertise_tags, years_experience, availability, is_paid, 
  hourly_rate, currency, linkedin_url, company, job_title, created_at, updated_at
) VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-222222222222',
  ARRAY['FinTech', 'Product Management', 'Fundraising', 'Team Scaling', 'B2B SaaS', 'Payment Processing'],
  12,
  'available',
  true,
  250.00,
  'USD',
  'https://linkedin.com/in/sarahchen',
  'Stripe',
  'VP of Product',
  NOW() - INTERVAL '2 years',
  NOW() - INTERVAL '2 days'
);

-- Investor Profile
INSERT INTO investor_profiles (
  user_id, investment_stage, ticket_size_min, ticket_size_max, sectors, 
  geographic_focus, fund_name, fund_size, portfolio_companies, 
  linkedin_url, website_url, created_at, updated_at
) VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-333333333333',
  ARRAY['pre_seed', 'seed', 'series_a'],
  100000,
  2000000,
  ARRAY['FinTech', 'B2B SaaS', 'AI/ML', 'Enterprise Software'],
  ARRAY['San Francisco Bay Area', 'Silicon Valley', 'California'],
  'Bay Area Ventures',
  '$150M',
  25,
  'https://linkedin.com/in/michaelrodriguez',
  'https://bayareaventures.com',
  NOW() - INTERVAL '3 years',
  NOW() - INTERVAL '1 day'
);

-- =============================================
-- 3. EVENTS (for co-attendance relationships)
-- =============================================

-- Create a FinTech networking event
INSERT INTO events (
  id, organizer_id, title, description, event_type, start_date, end_date,
  location, is_virtual, google_meet_link, max_participants, registration_deadline,
  is_public, tags, target_audience, created_at, updated_at
) VALUES (
  'event-1111-2222-3333-444444444444',
  'aaaaaaaa-bbbb-cccc-dddd-222222222222',
  'FinTech Innovation Summit 2024',
  'Join leading FinTech entrepreneurs, mentors, and investors for an evening of networking and insights. Featuring panel discussions on AI in payments, regulatory challenges, and funding trends.',
  'networking',
  NOW() + INTERVAL '2 weeks',
  NOW() + INTERVAL '2 weeks' + INTERVAL '3 hours',
  'San Francisco, CA - Tech Hub Downtown',
  false,
  NULL,
  100,
  NOW() + INTERVAL '1 week',
  true,
  ARRAY['FinTech', 'AI', 'Payments', 'Networking', 'Investment'],
  ARRAY['startup', 'mentor', 'investor'],
  NOW() - INTERVAL '1 month',
  NOW() - INTERVAL '1 week'
);

-- Event registrations (creates weak ties)
INSERT INTO event_registrations (event_id, user_id, status, registered_at) VALUES
('event-1111-2222-3333-444444444444', 'aaaaaaaa-bbbb-cccc-dddd-111111111111', 'registered', NOW() - INTERVAL '2 weeks'),
('event-1111-2222-3333-444444444444', 'aaaaaaaa-bbbb-cccc-dddd-222222222222', 'registered', NOW() - INTERVAL '3 weeks'),
('event-1111-2222-3333-444444444444', 'aaaaaaaa-bbbb-cccc-dddd-333333333333', 'registered', NOW() - INTERVAL '2 weeks');

-- =============================================
-- 4. MENTORSHIP RELATIONSHIPS (strong ties)
-- =============================================

-- Mentorship request from startup to mentor (accepted)
INSERT INTO mentorship_requests (
  startup_id, mentor_id, message, status, response_message, 
  created_at, updated_at, responded_at
) VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-111111111111',
  'aaaaaaaa-bbbb-cccc-dddd-222222222222',
  'Hi Sarah! I came across your profile and was impressed by your experience at Stripe. TechFlow is building AI-powered payment processing, and I would love to get your insights on product strategy and fundraising. Would you be open to a mentorship relationship?',
  'accepted',
  'Hi Alex! Your product sounds fascinating and right up my alley. I\'d be happy to mentor you. Let\'s start with a call to discuss your current challenges and goals.',
  NOW() - INTERVAL '2 months',
  NOW() - INTERVAL '1 month',
  NOW() - INTERVAL '1 month'
);

-- =============================================
-- 5. INVESTMENT RELATIONSHIPS (medium ties)
-- =============================================

-- Investment request from startup to investor (pending)
INSERT INTO investment_requests (
  startup_id, investor_id, message, pitch_deck_url, status, 
  created_at, updated_at
) VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-111111111111',
  'aaaaaaaa-bbbb-cccc-dddd-333333333333',
  'Hi Michael, TechFlow Solutions is raising a $2M seed round to scale our AI-powered payment processing platform. We\'re already processing $2M+ monthly volume with 95% fraud reduction. Given Bay Area Ventures\' focus on FinTech, I believe this could be a great fit. Would you be interested in learning more?',
  'https://techflow.com/pitch-deck.pdf',
  'pending',
  NOW() - INTERVAL '2 weeks',
  NOW() - INTERVAL '2 weeks'
);

-- =============================================
-- 6. CONNECTIONS
-- =============================================

-- Connection between startup and mentor (accepted)
INSERT INTO connections (
  requester_id, target_id, connection_type, status, message, 
  created_at, updated_at
) VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-111111111111',
  'aaaaaaaa-bbbb-cccc-dddd-222222222222',
  'startup_mentor',
  'accepted',
  'Looking forward to working together!',
  NOW() - INTERVAL '2 months',
  NOW() - INTERVAL '1 month'
);

-- Connection between startup and investor (pending)
INSERT INTO connections (
  requester_id, target_id, connection_type, status, message, 
  created_at, updated_at
) VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-111111111111',
  'aaaaaaaa-bbbb-cccc-dddd-333333333333',
  'startup_investor',
  'pending',
  'Excited to discuss potential investment opportunities.',
  NOW() - INTERVAL '2 weeks',
  NOW() - INTERVAL '2 weeks'
);

-- =============================================
-- 7. CONVERSATIONS AND MESSAGES
-- =============================================

-- Conversation between startup and mentor
INSERT INTO conversations (
  participant_1, participant_2, last_message_at, created_at
) VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-111111111111',
  'aaaaaaaa-bbbb-cccc-dddd-222222222222',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '1 month'
);

-- Messages in the conversation
INSERT INTO messages (sender_id, recipient_id, content, is_read, created_at) VALUES
(
  'aaaaaaaa-bbbb-cccc-dddd-111111111111',
  'aaaaaaaa-bbbb-cccc-dddd-222222222222',
  'Thanks for accepting my mentorship request! When would be a good time for our first call?',
  true,
  NOW() - INTERVAL '1 month'
),
(
  'aaaaaaaa-bbbb-cccc-dddd-222222222222',
  'aaaaaaaa-bbbb-cccc-dddd-111111111111',
  'Great to connect! How about this Friday at 2 PM? We can discuss your product roadmap and fundraising strategy.',
  true,
  NOW() - INTERVAL '1 month' + INTERVAL '2 hours'
),
(
  'aaaaaaaa-bbbb-cccc-dddd-111111111111',
  'aaaaaaaa-bbbb-cccc-dddd-222222222222',
  'Perfect! I\'ll send you our latest metrics and deck beforehand. Really looking forward to your insights.',
  true,
  NOW() - INTERVAL '3 days'
);

-- =============================================
-- 8. STARTUP UPDATES
-- =============================================

-- Recent startup updates
INSERT INTO startup_updates (
  startup_id, title, content, milestone_type, is_public, created_at, updated_at
) VALUES 
(
  (SELECT id FROM startup_profiles WHERE user_id = 'aaaaaaaa-bbbb-cccc-dddd-111111111111'),
  'Reached $2M Monthly Processing Volume! 🚀',
  'Excited to announce that TechFlow has crossed $2M in monthly payment processing volume! Our AI fraud detection has maintained a 95% accuracy rate while processing over 50,000 transactions. Big thanks to our amazing team and early customers who believed in our vision.',
  'revenue',
  true,
  NOW() - INTERVAL '1 week',
  NOW() - INTERVAL '1 week'
),
(
  (SELECT id FROM startup_profiles WHERE user_id = 'aaaaaaaa-bbbb-cccc-dddd-111111111111'),
  'Welcomed Jessica Liu as CTO',
  'Thrilled to welcome Jessica Liu as our CTO! Jessica brings 8 years of experience from Stripe where she led the payments infrastructure team. Her expertise will be crucial as we scale our platform.',
  'team',
  true,
  NOW() - INTERVAL '3 months',
  NOW() - INTERVAL '3 months'
);

-- =============================================
-- 9. TRANSACTIONS (for paid mentorship)
-- =============================================

-- Completed mentorship session payment
INSERT INTO transactions (
  mentor_id, startup_id, stripe_payment_intent_id, amount, currency, 
  status, session_duration, session_date, created_at, updated_at
) VALUES (
  (SELECT id FROM mentor_profiles WHERE user_id = 'aaaaaaaa-bbbb-cccc-dddd-222222222222'),
  (SELECT id FROM startup_profiles WHERE user_id = 'aaaaaaaa-bbbb-cccc-dddd-111111111111'),
  'pi_demo_1234567890',
  250.00,
  'USD',
  'succeeded',
  60,
  NOW() - INTERVAL '1 week',
  NOW() - INTERVAL '1 week',
  NOW() - INTERVAL '1 week'
);

-- =============================================
-- 10. NOTIFICATIONS
-- =============================================

-- Notifications for each user
INSERT INTO notifications (user_id, type, title, content, is_read, related_id, created_at) VALUES
-- Mentor notifications
(
  'aaaaaaaa-bbbb-cccc-dddd-222222222222',
  'connection_request',
  'New Connection Request',
  'Alex Chen from TechFlow Solutions wants to connect',
  true,
  (SELECT id FROM connections WHERE requester_id = 'aaaaaaaa-bbbb-cccc-dddd-111111111111' AND target_id = 'aaaaaaaa-bbbb-cccc-dddd-222222222222'),
  NOW() - INTERVAL '2 months'
),
-- Startup notifications
(
  'aaaaaaaa-bbbb-cccc-dddd-111111111111',
  'connection_accepted',
  'Connection Accepted',
  'Sarah Chen accepted your connection request',
  true,
  (SELECT id FROM connections WHERE requester_id = 'aaaaaaaa-bbbb-cccc-dddd-111111111111' AND target_id = 'aaaaaaaa-bbbb-cccc-dddd-222222222222'),
  NOW() - INTERVAL '1 month'
),
-- Investor notifications
(
  'aaaaaaaa-bbbb-cccc-dddd-333333333333',
  'connection_request',
  'New Investment Inquiry',
  'TechFlow Solutions is interested in connecting for potential investment',
  false,
  (SELECT id FROM connections WHERE requester_id = 'aaaaaaaa-bbbb-cccc-dddd-111111111111' AND target_id = 'aaaaaaaa-bbbb-cccc-dddd-333333333333'),
  NOW() - INTERVAL '2 weeks'
);

-- =============================================
-- SUMMARY OF CREATED RELATIONSHIPS
-- =============================================

/*
This seed data creates the following relationships for recommendation algorithm demonstration:

1. GRAPH-BASED RELATIONSHIPS:
   - Strong Tie: Startup ↔ Mentor (accepted mentorship)
   - Medium Tie: Startup → Investor (pending investment interest)
   - Weak Tie: All 3 users co-registered for FinTech event

2. ATTRIBUTE-BASED MATCHING:
   - Industry: All focused on FinTech
   - Location: All in San Francisco, CA
   - Stage Compatibility: Startup (seed stage) ↔ Investor (seed-series A focus)
   - Expertise Match: Mentor expertise aligns with startup needs

3. ACTIVITY DATA:
   - Messages and conversations
   - Startup updates and milestones
   - Completed transactions
   - Event registrations
   - Notifications

To use this data:
1. Replace the placeholder UUIDs with actual Supabase Auth user IDs
2. Run this script in your Supabase SQL editor
3. Login as each user to see personalized recommendations
4. The recommendation engine will show both graph-based and attribute-based suggestions
*/

-- End of demo data seed