-- Allow reviewers to post anonymously.
-- Identity (name, email, image) is retained server-side but masked in public
-- GET responses when is_anonymous = true, so the preference can be reversed later.

ALTER TABLE agent_reviews
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT false;
