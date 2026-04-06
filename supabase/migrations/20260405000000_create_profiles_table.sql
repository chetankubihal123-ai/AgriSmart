/*
  # Create Profiles Table and Trigger

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `phone` (text)
      - `full_name` (text, default 'Farmer')
      - `avatar_url` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `profiles`
    - Add policy for admins to select all profiles
    - Add policy for users to select their own profile
    - Add policy for users to update their own profile

  3. Functions and Triggers
    - Create a function to handle new user registration
    - Create a trigger on `auth.users` to call the function
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text,
  full_name text DEFAULT 'Farmer',
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'phone' = '9739623988' -- Replace with admin check logic if different
  );

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, full_name)
  VALUES (new.id, new.phone, 'Farmer');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call function on user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users (Optional, but good for testing)
INSERT INTO public.profiles (id, phone, full_name)
SELECT id, phone, 'Farmer' FROM auth.users
ON CONFLICT (id) DO NOTHING;
