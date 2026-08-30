
ALTER TABLE courses ADD COLUMN IF NOT EXISTS position integer DEFAULT 0;
WITH ranked_courses AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM courses
)
UPDATE courses
SET position = ranked_courses.rn
FROM ranked_courses
WHERE courses.id = ranked_courses.id;
