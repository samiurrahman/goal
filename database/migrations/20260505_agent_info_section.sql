-- Add info section columns directly to agents table.
-- No separate table needed since it's a 1:1 relationship.

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS info_heading text NOT NULL DEFAULT 'What We Provide',
  ADD COLUMN IF NOT EXISTS info_features jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS info_image_url text,
  ADD COLUMN IF NOT EXISTS info_use_default_image boolean NOT NULL DEFAULT true;
