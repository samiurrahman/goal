-- Create agent_reviews table for user reviews on agents
CREATE TABLE IF NOT EXISTS agent_reviews (
  id BIGSERIAL PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agent_id, user_id)
);

-- Create index for faster queries
CREATE INDEX idx_agent_reviews_agent_id ON agent_reviews(agent_id);
CREATE INDEX idx_agent_reviews_user_id ON agent_reviews(user_id);
CREATE INDEX idx_agent_reviews_created_at ON agent_reviews(created_at DESC);

-- Enable RLS
ALTER TABLE agent_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can read reviews
CREATE POLICY "Reviews are viewable by everyone" ON agent_reviews
  FOR SELECT USING (true);

-- RLS Policy: Users can only insert their own reviews
CREATE POLICY "Users can insert their own reviews" ON agent_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only update their own reviews
CREATE POLICY "Users can update their own reviews" ON agent_reviews
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only delete their own reviews
CREATE POLICY "Users can delete their own reviews" ON agent_reviews
  FOR DELETE USING (auth.uid() = user_id);
