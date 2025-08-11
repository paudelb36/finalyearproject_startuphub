# Startup Platform

A comprehensive web platform connecting startups, mentors, and investors. Built with Next.js 15, Supabase, and Tailwind CSS.

## Features

### Core Functionality
- **User Authentication**: Email/password and magic link authentication via Supabase Auth
- **Role-based Access**: Startup founders, mentors, investors, and admin roles
- **Profiles**: Comprehensive profiles for each user type with role-specific information
- **Discovery & Search**: Advanced search and filtering for startups, mentors, and investors
- **Real-time Messaging**: 1:1 messaging with real-time updates
- **Events & Pitch Submissions**: Event creation, registration, and pitch applications
- **Notifications**: In-app and email notifications
- **Admin Panel**: User management, content moderation, and analytics
- **Payments**: Stripe integration for paid mentorship sessions

### User Roles

#### Startups
- Create detailed company profiles with team information
- Upload pitch decks and company assets
- Browse and connect with mentors and investors
- Apply to pitch events
- Post company updates
- Request mentorship and investment

#### Mentors
- Create expertise-based profiles
- Offer free or paid mentorship sessions
- Accept/decline mentorship requests
- Create and host events/webinars
- Set availability and pricing

#### Investors
- Create investment preference profiles
- Discover and evaluate startups
- Create pitch events and review applications
- Initiate conversations with startups
- Manage investment pipeline

#### Admin
- Manage all users and content
- Moderate flagged content
- View platform analytics
- Create system-wide announcements
- Handle user reports and disputes

## Tech Stack

- **Frontend**: Next.js 15 with App Router
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Styling**: Tailwind CSS
- **Payments**: Stripe
- **File Storage**: Supabase Storage
- **Real-time**: Supabase Realtime
- **Email**: Supabase SMTP or custom SMTP

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.js          # Root layout
│   ├── page.js            # Home page
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # User dashboard
│   ├── admin/             # Admin panel
│   ├── startups/          # Startup profiles
│   ├── mentors/           # Mentor profiles
│   ├── investors/         # Investor profiles
│   ├── events/            # Events listing
│   └── messages/          # Messaging interface
├── components/            # Reusable React components
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions and API helpers
│   ├── supabase.js       # Supabase client configuration
│   └── api/              # API helper functions
middleware.js              # Next.js middleware for auth
supabase_schema.sql        # Database schema
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Stripe account (for payments)

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Supabase and Stripe credentials in `.env.local`

3. **Set up Supabase**
   - Create a new Supabase project
   - Run the SQL schema from `supabase_schema.sql` in your Supabase SQL editor
   - Set up Row Level Security (RLS) policies as defined in the schema
   - Configure authentication providers in Supabase Auth settings
   - Set up storage buckets for file uploads

4. **Set up Stripe (optional)**
   - Create a Stripe account
   - Get your publishable and secret keys
   - Set up webhooks for payment processing

5. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The platform uses a comprehensive PostgreSQL schema with the following main tables:

- `profiles` - User profiles and authentication data
- `startup_profiles` - Startup-specific information
- `mentor_profiles` - Mentor-specific information
- `investor_profiles` - Investor-specific information
- `events` - Events and webinars
- `messages` - Real-time messaging
- `connections` - User connections and requests
- `notifications` - In-app notifications
- `transactions` - Payment records
- `content_flags` - Content moderation

See `supabase_schema.sql` for the complete schema with indexes, triggers, and RLS policies.

## Authentication

The platform supports multiple authentication methods:

- **Email/Password**: Traditional authentication
- **Magic Links**: Passwordless authentication via email
- **Social Providers**: Can be configured in Supabase (Google, GitHub, etc.)

Authentication is handled by:
- `AuthProvider` component for client-side auth state
- Middleware for route protection
- Server-side helpers for API routes

## Real-time Features

Real-time functionality is powered by Supabase Realtime:

- **Messages**: Live chat updates
- **Notifications**: Instant notification delivery
- **Connection Requests**: Real-time request status updates
- **Event Updates**: Live event information changes

## File Uploads

File upload capabilities include:

- **Profile Images**: User avatars and company logos
- **Pitch Decks**: PDF uploads for startup presentations
- **Company Assets**: Additional images and documents
- **Event Materials**: Resources for events and webinars

Files are stored in Supabase Storage with appropriate access controls.

## Payments

Stripe integration enables:

- **Paid Mentorship**: Hourly rate payments for mentor sessions
- **Event Tickets**: Paid event registration
- **Platform Fees**: Commission handling
- **Payouts**: Mentor payment distribution via Stripe Connect

## Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms

The app can be deployed to any platform supporting Next.js:

- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## Environment Variables

Required environment variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# App
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_APP_NAME=
```

See `.env.example` for all available configuration options.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:

- Create an issue in the repository
- Check the documentation
- Review the code comments for implementation details
