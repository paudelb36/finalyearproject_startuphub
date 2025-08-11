-- Dummy Users Seed Data
-- This script creates 30 users: 10 startups, 10 mentors, 10 investors
-- Run this in Supabase SQL Editor

-- First, we need to insert into auth.users (Supabase's authentication table)
-- Note: In production, you would use Supabase Auth API, but for seeding we'll insert directly

-- Insert dummy users into auth.users
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
VALUES 
-- Startup Users (password: startup@1234)
('11111111-1111-1111-1111-111111111111', 'startup1@example.com', '$2a$10$8K1p/a0dhrxSHxN5.WiISOeymvMoqSTnBpo8gBoVRRUIHZwgASS3K', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),
('11111111-1111-1111-1111-111111111112', 'startup2@example.com', '$2a$10$8K1p/a0dhrxSHxN5.WiISOeymvMoqSTnBpo8gBoVRRUIHZwgASS3K', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),
('11111111-1111-1111-1111-111111111113', 'startup3@example.com', '$2a$10$8K1p/a0dhrxSHxN5.WiISOeymvMoqSTnBpo8gBoVRRUIHZwgASS3K', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),
('11111111-1111-1111-1111-111111111114', 'startup4@example.com', '$2a$10$8K1p/a0dhrxSHxN5.WiISOeymvMoqSTnBpo8gBoVRRUIHZwgASS3K', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),
('11111111-1111-1111-1111-111111111115', 'startup5@example.com', '$2a$10$8K1p/a0dhrxSHxN5.WiISOeymvMoqSTnBpo8gBoVRRUIHZwgASS3K', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),
('11111111-1111-1111-1111-111111111116', 'startup6@example.com', '$2a$10$8K1p/a0dhrxSHxN5.WiISOeymvMoqSTnBpo8gBoVRRUIHZwgASS3K', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),
('11111111-1111-1111-1111-111111111117', 'startup7@example.com', '$2a$10$8K1p/a0dhrxSHxN5.WiISOeymvMoqSTnBpo8gBoVRRUIHZwgASS3K', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),
('11111111-1111-1111-1111-111111111118', 'startup8@example.com', '$2a$10$8K1p/a0dhrxSHxN5.WiISOeymvMoqSTnBpo8gBoVRRUIHZwgASS3K', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),
('11111111-1111-1111-1111-111111111119', 'startup9@example.com', '$2a$10$8K1p/a0dhrxSHxN5.WiISOeymvMoqSTnBpo8gBoVRRUIHZwgASS3K', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),
('11111111-1111-1111-1111-111111111120', 'startup10@example.com', '$2a$10$8K1p/a0dhrxSHxN5.WiISOeymvMoqSTnBpo8gBoVRRUIHZwgASS3K', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),

-- Mentor Users (password: mentor@1234)
('22222222-2222-2222-2222-222222222221', 'mentor1@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),
('22222222-2222-2222-2222-222222222222', 'mentor2@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),
('22222222-2222-2222-2222-222222222223', 'mentor3@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),
('22222222-2222-2222-2222-222222222224', 'mentor4@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),
('22222222-2222-2222-2222-222222222225', 'mentor5@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),
('22222222-2222-2222-2222-222222222226', 'mentor6@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),
('22222222-2222-2222-2222-222222222227', 'mentor7@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),
('22222222-2222-2222-2222-222222222228', 'mentor8@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),
('22222222-2222-2222-2222-222222222229', 'mentor9@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),
('22222222-2222-2222-2222-222222222230', 'mentor10@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),

-- Investor Users (password: investor@1234)
('33333333-3333-3333-3333-333333333331', 'investor1@example.com', '$2a$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),
('33333333-3333-3333-3333-333333333332', 'investor2@example.com', '$2a$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),
('33333333-3333-3333-3333-333333333333', 'investor3@example.com', '$2a$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),
('33333333-3333-3333-3333-333333333334', 'investor4@example.com', '$2a$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),
('33333333-3333-3333-3333-333333333335', 'investor5@example.com', '$2a$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),
('33333333-3333-3333-3333-333333333336', 'investor6@example.com', '$2a$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),
('33333333-3333-3333-3333-333333333337', 'investor7@example.com', '$2a$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),
('33333333-3333-3333-3333-333333333338', 'investor8@example.com', '$2a$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),
('33333333-3333-3333-3333-333333333339', 'investor9@example.com', '$2a$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}'),
('33333333-3333-3333-3333-333333333340', 'investor10@example.com', '$2a$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm', NOW(), NOW(), NOW(), '{"provider": "email", "providers": ["email"]}', '{}');

-- Insert profiles
INSERT INTO profiles (id, email, full_name, role, location, bio) VALUES
-- Startup Profiles
('11111111-1111-1111-1111-111111111111', 'startup1@example.com', 'Alex Johnson', 'startup', 'San Francisco, CA', 'Founder of TechFlow, building the future of workflow automation.'),
('11111111-1111-1111-1111-111111111112', 'startup2@example.com', 'Sarah Chen', 'startup', 'New York, NY', 'CEO of EcoGreen, revolutionizing sustainable packaging solutions.'),
('11111111-1111-1111-1111-111111111113', 'startup3@example.com', 'Michael Rodriguez', 'startup', 'Austin, TX', 'Co-founder of HealthTech Pro, making healthcare accessible through AI.'),
('11111111-1111-1111-1111-111111111114', 'startup4@example.com', 'Emily Davis', 'startup', 'Seattle, WA', 'Founder of EduLearn, transforming online education with interactive learning.'),
('11111111-1111-1111-1111-111111111115', 'startup5@example.com', 'David Kim', 'startup', 'Los Angeles, CA', 'CEO of FinanceFlow, simplifying personal finance management.'),
('11111111-1111-1111-1111-111111111116', 'startup6@example.com', 'Jessica Brown', 'startup', 'Boston, MA', 'Founder of FoodieConnect, connecting local food producers with consumers.'),
('11111111-1111-1111-1111-111111111117', 'startup7@example.com', 'Robert Wilson', 'startup', 'Denver, CO', 'Co-founder of SportsTech, enhancing athletic performance through data analytics.'),
('11111111-1111-1111-1111-111111111118', 'startup8@example.com', 'Amanda Taylor', 'startup', 'Miami, FL', 'CEO of TravelSmart, revolutionizing travel planning with AI recommendations.'),
('11111111-1111-1111-1111-111111111119', 'startup9@example.com', 'James Anderson', 'startup', 'Chicago, IL', 'Founder of RetailTech, optimizing inventory management for small businesses.'),
('11111111-1111-1111-1111-111111111120', 'startup10@example.com', 'Lisa Martinez', 'startup', 'Portland, OR', 'CEO of GreenEnergy Solutions, advancing renewable energy adoption.'),

-- Mentor Profiles
('22222222-2222-2222-2222-222222222221', 'mentor1@example.com', 'Dr. Jennifer Smith', 'mentor', 'Silicon Valley, CA', 'Former VP of Engineering at Google, now helping startups scale their tech teams.'),
('22222222-2222-2222-2222-222222222222', 'mentor2@example.com', 'Mark Thompson', 'mentor', 'New York, NY', 'Serial entrepreneur with 3 successful exits, specializing in B2B SaaS.'),
('22222222-2222-2222-2222-222222222223', 'mentor3@example.com', 'Dr. Rachel Green', 'mentor', 'Boston, MA', 'Healthcare industry expert with 20+ years experience in medical devices.'),
('22222222-2222-2222-2222-222222222224', 'mentor4@example.com', 'Carlos Mendez', 'mentor', 'Austin, TX', 'Former CMO at Uber, expert in growth marketing and user acquisition.'),
('22222222-2222-2222-2222-222222222225', 'mentor5@example.com', 'Dr. Susan Lee', 'mentor', 'Seattle, WA', 'AI/ML researcher and consultant, helping startups implement AI solutions.'),
('22222222-2222-2222-2222-222222222226', 'mentor6@example.com', 'Thomas Clark', 'mentor', 'San Francisco, CA', 'Former CFO at multiple startups, expert in fundraising and financial planning.'),
('22222222-2222-2222-2222-222222222227', 'mentor7@example.com', 'Maria Gonzalez', 'mentor', 'Los Angeles, CA', 'E-commerce and retail expert, former VP at Amazon.'),
('22222222-2222-2222-2222-222222222228', 'mentor8@example.com', 'Kevin O''Connor', 'mentor', 'Chicago, IL', 'Product management expert with experience at Apple and Microsoft.'),
('22222222-2222-2222-2222-222222222229', 'mentor9@example.com', 'Dr. Priya Patel', 'mentor', 'Denver, CO', 'Biotech and pharmaceutical industry veteran with regulatory expertise.'),
('22222222-2222-2222-2222-222222222230', 'mentor10@example.com', 'Richard Hayes', 'mentor', 'Miami, FL', 'Sales and business development expert, former VP Sales at Salesforce.'),

-- Investor Profiles
('33333333-3333-3333-3333-333333333331', 'investor1@example.com', 'Victoria Capital', 'investor', 'Palo Alto, CA', 'Partner at Sequoia Capital, focusing on early-stage tech investments.'),
('33333333-3333-3333-3333-333333333332', 'investor2@example.com', 'Andrew Foster', 'investor', 'New York, NY', 'Managing Director at Andreessen Horowitz, specializing in fintech.'),
('33333333-3333-3333-3333-333333333333', 'investor3@example.com', 'Catherine Wong', 'investor', 'Boston, MA', 'Principal at General Catalyst, focused on healthcare and biotech.'),
('33333333-3333-3333-3333-333333333334', 'investor4@example.com', 'Daniel Murphy', 'investor', 'Austin, TX', 'Partner at Kleiner Perkins, investing in AI and machine learning startups.'),
('33333333-3333-3333-3333-333333333335', 'investor5@example.com', 'Sophie Zhang', 'investor', 'Seattle, WA', 'Investment Manager at Bessemer Venture Partners, focused on SaaS.'),
('33333333-3333-3333-3333-333333333336', 'investor6@example.com', 'Jonathan Miller', 'investor', 'San Francisco, CA', 'Angel investor and former founder, investing in consumer tech.'),
('33333333-3333-3333-3333-333333333337', 'investor7@example.com', 'Isabella Rodriguez', 'investor', 'Los Angeles, CA', 'Partner at Lightspeed Venture Partners, focused on e-commerce.'),
('33333333-3333-3333-3333-333333333338', 'investor8@example.com', 'Christopher Lee', 'investor', 'Chicago, IL', 'Principal at Accel Partners, specializing in enterprise software.'),
('33333333-3333-3333-3333-333333333339', 'investor9@example.com', 'Natalie Johnson', 'investor', 'Denver, CO', 'Managing Partner at First Round Capital, focused on seed investments.'),
('33333333-3333-3333-3333-333333333340', 'investor10@example.com', 'Benjamin Scott', 'investor', 'Miami, FL', 'Partner at Index Ventures, investing in global tech startups.');

-- Insert startup profiles
INSERT INTO startup_profiles (user_id, company_name, tagline, description, industry, stage, location, website_url, founded_date, employee_count, funding_stage, funding_goal, funding_raised, slug) VALUES
('11111111-1111-1111-1111-111111111111', 'TechFlow', 'Automate your workflow, amplify your productivity', 'TechFlow is a comprehensive workflow automation platform that helps businesses streamline their operations and boost productivity through intelligent automation.', 'Technology', 'mvp', 'San Francisco, CA', 'https://techflow.com', '2023-01-15', 8, 'seed', 2000000, 500000, 'techflow'),
('11111111-1111-1111-1111-111111111112', 'EcoGreen', 'Sustainable packaging for a better tomorrow', 'EcoGreen develops biodegradable packaging solutions that help businesses reduce their environmental footprint while maintaining product quality and cost-effectiveness.', 'Sustainability', 'early_revenue', 'New York, NY', 'https://ecogreen.com', '2022-08-20', 12, 'series_a', 5000000, 1200000, 'ecogreen'),
('11111111-1111-1111-1111-111111111113', 'HealthTech Pro', 'AI-powered healthcare for everyone', 'HealthTech Pro leverages artificial intelligence to make healthcare more accessible and affordable, providing diagnostic tools and treatment recommendations.', 'Healthcare', 'growth', 'Austin, TX', 'https://healthtechpro.com', '2022-03-10', 25, 'series_a', 8000000, 3000000, 'healthtech-pro'),
('11111111-1111-1111-1111-111111111114', 'EduLearn', 'Interactive learning for the digital age', 'EduLearn creates immersive educational experiences using VR/AR technology to make learning more engaging and effective for students of all ages.', 'Education', 'mvp', 'Seattle, WA', 'https://edulearn.com', '2023-05-01', 6, 'pre_seed', 1000000, 200000, 'edulearn'),
('11111111-1111-1111-1111-111111111115', 'FinanceFlow', 'Personal finance made simple', 'FinanceFlow is a personal finance management app that uses AI to provide personalized budgeting advice and investment recommendations.', 'Fintech', 'early_revenue', 'Los Angeles, CA', 'https://financeflow.com', '2022-11-15', 15, 'seed', 3000000, 800000, 'financeflow'),
('11111111-1111-1111-1111-111111111116', 'FoodieConnect', 'Connecting local food communities', 'FoodieConnect is a marketplace that connects local food producers with consumers, promoting sustainable agriculture and supporting local economies.', 'Food & Agriculture', 'prototype', 'Boston, MA', 'https://foodieconnect.com', '2023-02-28', 4, 'pre_seed', 500000, 100000, 'foodie-connect'),
('11111111-1111-1111-1111-111111111117', 'SportsTech', 'Data-driven athletic performance', 'SportsTech provides advanced analytics and performance tracking tools for athletes and coaches to optimize training and improve results.', 'Sports & Fitness', 'mvp', 'Denver, CO', 'https://sportstech.com', '2023-04-12', 10, 'seed', 2500000, 600000, 'sportstech'),
('11111111-1111-1111-1111-111111111118', 'TravelSmart', 'AI-powered travel planning', 'TravelSmart uses artificial intelligence to create personalized travel itineraries and recommendations based on user preferences and budget.', 'Travel & Tourism', 'early_revenue', 'Miami, FL', 'https://travelsmart.com', '2022-09-05', 18, 'series_a', 4000000, 1500000, 'travelsmart'),
('11111111-1111-1111-1111-111111111119', 'RetailTech', 'Smart inventory management', 'RetailTech provides AI-powered inventory management solutions for small and medium-sized retail businesses to optimize stock levels and reduce waste.', 'Retail Technology', 'growth', 'Chicago, IL', 'https://retailtech.com', '2022-06-18', 22, 'series_a', 6000000, 2200000, 'retailtech'),
('11111111-1111-1111-1111-111111111120', 'GreenEnergy Solutions', 'Accelerating renewable energy adoption', 'GreenEnergy Solutions develops innovative solar and wind energy systems for residential and commercial use, making renewable energy more accessible.', 'Clean Energy', 'scale', 'Portland, OR', 'https://greenenergy.com', '2021-12-01', 35, 'series_b', 15000000, 8000000, 'greenenergy-solutions');

-- Insert mentor profiles
INSERT INTO mentor_profiles (user_id, expertise_tags, years_experience, availability, is_paid, hourly_rate, currency, linkedin_url, company, job_title) VALUES
('22222222-2222-2222-2222-222222222221', ARRAY['Engineering', 'Scaling Teams', 'Technical Leadership', 'Software Architecture'], 15, 'available', true, 26400.00, 'NPR', 'https://linkedin.com/in/jennifersmith', 'Google', 'Former VP of Engineering'),
('22222222-2222-2222-2222-222222222222', ARRAY['B2B SaaS', 'Fundraising', 'Product Strategy', 'Go-to-Market'], 12, 'available', true, 33000.00, 'NPR', 'https://linkedin.com/in/markthompson', 'Thompson Ventures', 'Managing Partner'),
('22222222-2222-2222-2222-222222222223', ARRAY['Healthcare', 'Medical Devices', 'Regulatory Affairs', 'Clinical Trials'], 20, 'busy', true, 39600.00, 'NPR', 'https://linkedin.com/in/rachelgreen', 'MedTech Consulting', 'Principal Consultant'),
('22222222-2222-2222-2222-222222222224', ARRAY['Growth Marketing', 'User Acquisition', 'Brand Strategy', 'Digital Marketing'], 10, 'available', true, 23760.00, 'NPR', 'https://linkedin.com/in/carlosmendez', 'Growth Partners', 'Marketing Consultant'),
('22222222-2222-2222-2222-222222222225', ARRAY['Artificial Intelligence', 'Machine Learning', 'Data Science', 'Technical Strategy'], 18, 'available', true, 29040.00, 'NPR', 'https://linkedin.com/in/susanlee', 'AI Research Lab', 'Senior Research Scientist'),
('22222222-2222-2222-2222-222222222226', ARRAY['Financial Planning', 'Fundraising', 'CFO Services', 'Investment Strategy'], 14, 'available', true, 25080.00, 'NPR', 'https://linkedin.com/in/thomasclark', 'Financial Advisory Group', 'Senior Advisor'),
('22222222-2222-2222-2222-222222222227', ARRAY['E-commerce', 'Retail Strategy', 'Supply Chain', 'Customer Experience'], 16, 'busy', true, 27720.00, 'NPR', 'https://linkedin.com/in/mariagonzalez', 'Retail Innovations', 'Strategic Advisor'),
('22222222-2222-2222-2222-222222222228', ARRAY['Product Management', 'User Experience', 'Product Strategy', 'Agile Development'], 13, 'available', true, 23100.00, 'NPR', 'https://linkedin.com/in/kevinoconnor', 'Product Excellence', 'Product Consultant'),
('22222222-2222-2222-2222-222222222229', ARRAY['Biotech', 'Pharmaceutical', 'Regulatory Strategy', 'Drug Development'], 22, 'available', true, 36960.00, 'NPR', 'https://linkedin.com/in/priyapatel', 'BioConsulting Partners', 'Senior Partner'),
('22222222-2222-2222-2222-222222222230', ARRAY['Sales Strategy', 'Business Development', 'Enterprise Sales', 'Channel Partnerships'], 17, 'available', true, 25740.00, 'NPR', 'https://linkedin.com/in/richardhayes', 'Sales Excellence Group', 'Sales Consultant');

-- Insert investor profiles
INSERT INTO investor_profiles (user_id, investment_stage, ticket_size_min, ticket_size_max, sectors, geographic_focus, fund_name, fund_size, portfolio_companies, linkedin_url, website_url) VALUES
('33333333-3333-3333-3333-333333333331', ARRAY['seed', 'series_a'], 100000, 5000000, ARRAY['Technology', 'SaaS', 'AI/ML'], ARRAY['North America', 'Europe'], 'Sequoia Capital', '$8.5B', 150, 'https://linkedin.com/in/victoriacapital', 'https://sequoiacap.com'),
('33333333-3333-3333-3333-333333333332', ARRAY['series_a', 'series_b'], 500000, 15000000, ARRAY['Fintech', 'Blockchain', 'Digital Banking'], ARRAY['North America'], 'Andreessen Horowitz', '$4.2B', 85, 'https://linkedin.com/in/andrewfoster', 'https://a16z.com'),
('33333333-3333-3333-3333-333333333333', ARRAY['seed', 'series_a'], 250000, 8000000, ARRAY['Healthcare', 'Biotech', 'Medical Devices'], ARRAY['North America', 'Europe'], 'General Catalyst', '$6.1B', 120, 'https://linkedin.com/in/catherinewong', 'https://generalcatalyst.com'),
('33333333-3333-3333-3333-333333333334', ARRAY['pre_seed', 'seed'], 50000, 3000000, ARRAY['AI/ML', 'Robotics', 'Deep Tech'], ARRAY['Global'], 'Kleiner Perkins', '$2.8B', 95, 'https://linkedin.com/in/danielmurphy', 'https://kleinerperkins.com'),
('33333333-3333-3333-3333-333333333335', ARRAY['series_a', 'series_b'], 1000000, 20000000, ARRAY['SaaS', 'Enterprise Software', 'Cloud Infrastructure'], ARRAY['North America', 'Europe'], 'Bessemer Venture Partners', '$9.0B', 200, 'https://linkedin.com/in/sophiezhang', 'https://bvp.com'),
('33333333-3333-3333-3333-333333333336', ARRAY['pre_seed', 'seed'], 25000, 1000000, ARRAY['Consumer Tech', 'Mobile Apps', 'E-commerce'], ARRAY['North America'], 'Angel Investor', '$50M', 45, 'https://linkedin.com/in/jonathanmiller', 'https://jonathanmiller.com'),
('33333333-3333-3333-3333-333333333337', ARRAY['seed', 'series_a'], 200000, 10000000, ARRAY['E-commerce', 'Marketplace', 'Consumer Brands'], ARRAY['North America', 'Latin America'], 'Lightspeed Venture Partners', '$7.3B', 180, 'https://linkedin.com/in/isabellarodriguez', 'https://lsvp.com'),
('33333333-3333-3333-3333-333333333338', ARRAY['series_a', 'series_b'], 750000, 25000000, ARRAY['Enterprise Software', 'Cybersecurity', 'DevTools'], ARRAY['Global'], 'Accel Partners', '$5.5B', 140, 'https://linkedin.com/in/christopherlee', 'https://accel.com'),
('33333333-3333-3333-3333-333333333339', ARRAY['pre_seed', 'seed'], 100000, 2000000, ARRAY['Technology', 'SaaS', 'Mobile'], ARRAY['North America'], 'First Round Capital', '$1.8B', 75, 'https://linkedin.com/in/nataliejohnson', 'https://firstround.com'),
('33333333-3333-3333-3333-333333333340', ARRAY['series_a', 'series_b', 'series_c'], 2000000, 50000000, ARRAY['Technology', 'SaaS', 'Marketplace'], ARRAY['Global'], 'Index Ventures', '$12.1B', 250, 'https://linkedin.com/in/benjaminscott', 'https://indexventures.com');

-- Insert some team members for startups
INSERT INTO team_members (startup_id, name, role, bio, linkedin_url, is_founder) VALUES
((SELECT id FROM startup_profiles WHERE slug = 'techflow'), 'Alex Johnson', 'CEO & Founder', 'Serial entrepreneur with background in enterprise software', 'https://linkedin.com/in/alexjohnson', true),
((SELECT id FROM startup_profiles WHERE slug = 'techflow'), 'Maria Santos', 'CTO', 'Former senior engineer at Microsoft with 10+ years experience', 'https://linkedin.com/in/mariasantos', false),
((SELECT id FROM startup_profiles WHERE slug = 'ecogreen'), 'Sarah Chen', 'CEO & Founder', 'Environmental scientist turned entrepreneur', 'https://linkedin.com/in/sarahchen', true),
((SELECT id FROM startup_profiles WHERE slug = 'ecogreen'), 'David Park', 'Head of Operations', 'Supply chain expert with sustainability focus', 'https://linkedin.com/in/davidpark', false),
((SELECT id FROM startup_profiles WHERE slug = 'healthtech-pro'), 'Michael Rodriguez', 'CEO & Co-founder', 'Former healthcare consultant with AI expertise', 'https://linkedin.com/in/michaelrodriguez', true),
((SELECT id FROM startup_profiles WHERE slug = 'healthtech-pro'), 'Dr. Lisa Wang', 'Chief Medical Officer', 'Practicing physician and medical AI researcher', 'https://linkedin.com/in/lisawang', true);

-- Insert some events
INSERT INTO events (organizer_id, title, description, event_type, start_date, end_date, location, is_virtual, max_participants, is_public, tags) VALUES
('22222222-2222-2222-2222-222222222221', 'Scaling Engineering Teams Workshop', 'Learn best practices for building and scaling engineering teams in high-growth startups', 'workshop', '2024-02-15 14:00:00+00', '2024-02-15 17:00:00+00', 'San Francisco, CA', false, 50, true, ARRAY['engineering', 'scaling', 'leadership']),
('33333333-3333-3333-3333-333333333331', 'Seed Funding Pitch Event', 'Early-stage startups pitch to leading seed investors', 'pitch_event', '2024-02-20 18:00:00+00', '2024-02-20 21:00:00+00', 'Palo Alto, CA', false, 100, true, ARRAY['funding', 'pitch', 'seed']),
('22222222-2222-2222-2222-222222222224', 'Growth Marketing Masterclass', 'Advanced strategies for user acquisition and retention', 'webinar', '2024-02-25 16:00:00+00', '2024-02-25 18:00:00+00', 'Virtual', true, 200, true, ARRAY['marketing', 'growth', 'acquisition']);

-- Insert some connections
INSERT INTO connections (requester_id, recipient_id, connection_type, status, message) VALUES
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', 'startup_mentor', 'accepted', 'Hi Jennifer, I would love to get your advice on scaling our engineering team.'),
('11111111-1111-1111-1111-111111111112', '33333333-3333-3333-3333-333333333333', 'startup_investor', 'pending', 'Hello Catherine, EcoGreen would be a great fit for your healthcare and sustainability portfolio.'),
('11111111-1111-1111-1111-111111111113', '22222222-2222-2222-2222-222222222223', 'startup_mentor', 'accepted', 'Dr. Green, we could really use your expertise in healthcare regulations.'),
('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333332', 'mentor_investor', 'accepted', 'Andrew, I have some great B2B SaaS startups you might be interested in.');

COMMIT;