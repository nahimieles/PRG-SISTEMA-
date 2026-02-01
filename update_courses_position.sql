-- Add position column for ordering courses within a company assignment
ALTER TABLE course_assignments ADD COLUMN IF NOT EXISTS position integer DEFAULT 0;

-- Optional: Initial population of position based on created_at
-- This is a bit complex in SQL for update-from-select dependent on partition, 
-- but since data is new, default 0 is fine.
