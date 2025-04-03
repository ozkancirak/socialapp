# Social Media App

A modern social media application built with Next.js, Typescript, Tailwind CSS, Supabase, and Clerk.

## Tech Stack

### Core Framework

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS

### Authentication & Database

- Clerk - Authentication and user management
- Supabase - Database and storage

### UI Components

- Radix UI - Headless UI components
- Shadcn UI - Re-usable components built on Radix UI
- Lucide React - Icon library
- Next Themes - Theme management

### Form & Data Management

- React Hook Form - Form management
- Zod - Schema validation
- TanStack Query (React Query) - Server state management

### Media & Rich Content

- Tiptap - Rich text editor
- Cloudinary - Media storage
- React Cropper - Image cropping
- Socket.io - Real-time messaging (optional)

## Features

- User authentication with Clerk
- User profiles
- News feed
- Create, edit, delete posts
- Like and comment on posts
- Follow/unfollow users
- Real-time notifications
- Dark mode support
- Responsive design

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/socialapp.git
cd socialapp
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables:

- Copy the `.env.example` file to `.env.local`
- Fill in your API keys and settings

4. Set up Supabase:

- First, execute the `setup.sql` in your Supabase SQL editor to create the helper function
- Then run the setup script to create the required functions for Clerk integration:

```bash
pnpm setup-supabase
```

5. Run the development server:

```bash
pnpm dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
src/
├── app/             # Next.js App Router
├── components/      # React components
│   ├── auth/        # Authentication components
│   ├── layout/      # Layout components
│   ├── post/        # Post-related components
│   ├── profile/     # Profile-related components
│   └── ui/          # UI components (Shadcn UI)
└── lib/             # Utility functions and libs
    ├── actions/     # Server actions
    ├── api/         # API related code
    ├── auth/        # Auth utilities
    ├── db/          # Database utilities
    ├── utils/       # Helper utilities
    └── validations/ # Zod schemas
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new).

## License

This project is licensed under the MIT License.

## Supabase Setup

To set up the Supabase backend:

1. First, create a new Supabase project
2. Add your Supabase URL and anon key to `.env.local`
3. Run the setup script to create the database schema and functions:

```bash
pnpm setup-supabase
```

This script will:

- Create the necessary tables (users, posts)
- Set up Row Level Security policies
- Create helper functions
- Create a storage bucket for post images

Alternatively, you can manually run the SQL files in the `supabase` directory:

- `setup.sql` - Helper functions
- `schema.sql` - Main database schema and policies
- `storage.sql` - Storage bucket helpers
