-- Add icon_name column to courses table
ALTER TABLE courses ADD COLUMN IF NOT EXISTS icon_name TEXT DEFAULT 'FileText';

COMMENT ON COLUMN courses.icon_name IS 'Name of the Lucide icon to display for this course';
