-- Add user_email, user_name, and user_profile_image columns to agent_reviews for displaying review author info
ALTER TABLE agent_reviews 
ADD COLUMN IF NOT EXISTS user_email TEXT,
ADD COLUMN IF NOT EXISTS user_name TEXT,
ADD COLUMN IF NOT EXISTS user_profile_image TEXT;
