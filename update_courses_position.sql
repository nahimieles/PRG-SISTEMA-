-- Add position column to courses table for Drag and Drop ordering
ALTER TABLE courses ADD COLUMN IF NOT EXISTS position integer DEFAULT 0;

-- Optional: Initial population of position based on creation time to avoid nulls/chaos
WITH ranked_courses AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM courses
)
UPDATE courses
SET position = ranked_courses.rn
FROM ranked_courses
WHERE courses.id = ranked_courses.id;
