
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for all users" ON public.audit_records;
DROP POLICY IF EXISTS "Enable all access for now" ON public.attendance_records;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.workers;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.companies;
DROP POLICY IF EXISTS "Enable all access for now" ON public.recruitment_surveys;
DROP POLICY IF EXISTS "Public can view active surveys" ON public.recruitment_surveys;
DROP POLICY IF EXISTS "Public can view active survey questions" ON public.recruitment_questions;
DROP POLICY IF EXISTS "Public can insert candidates" ON public.recruitment_candidates;
DROP POLICY IF EXISTS "Public can insert responses" ON public.recruitment_responses;
DROP POLICY IF EXISTS "Admins can do everything on recruitment_surveys" ON public.recruitment_surveys;

CREATE POLICY "Admin Users Lockdown" ON public.admin_users FOR ALL USING (false);

CREATE POLICY "Public Read Workers" ON public.workers FOR SELECT USING (true);
CREATE POLICY "Public Read Companies" ON public.companies FOR SELECT USING (true);
CREATE POLICY "Public Read Groups" ON public.company_groups FOR SELECT USING (true);
CREATE POLICY "Public Read Surveys" ON public.recruitment_surveys FOR SELECT USING (is_active = true);
CREATE POLICY "Public Read Questions" ON public.recruitment_questions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.recruitment_surveys WHERE id = survey_id AND is_active = true)
);
CREATE POLICY "Public Selective Read Records" ON public.audit_records FOR SELECT USING (true);
CREATE POLICY "Public Selective Read Attendance" ON public.attendance_records FOR SELECT USING (true);
CREATE POLICY "Public Selective Read Candidates" ON public.recruitment_candidates FOR SELECT USING (true);
CREATE POLICY "Public Selective Read Responses" ON public.recruitment_responses FOR SELECT USING (true);

CREATE POLICY "Worker Insert Audit Records" ON public.audit_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Worker Attendance Check-In" ON public.attendance_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Worker Attendance Check-Out" ON public.attendance_records FOR UPDATE USING (status = 'active') WITH CHECK (status = 'completed');
CREATE POLICY "Candidate Apply" ON public.recruitment_candidates FOR INSERT WITH CHECK (true);
CREATE POLICY "Candidate Respond" ON public.recruitment_responses FOR INSERT WITH CHECK (true);

CREATE POLICY "Restrict Worker Deletion" ON public.workers FOR DELETE USING (false);
CREATE POLICY "Restrict Company Deletion" ON public.companies FOR DELETE USING (false);
CREATE POLICY "Restrict Audit Deletion" ON public.audit_records FOR DELETE USING (false);
CREATE POLICY "Restrict Attendance Deletion" ON public.attendance_records FOR DELETE USING (false);
CREATE POLICY "Restrict Survey Deletion" ON public.recruitment_surveys FOR DELETE USING (false);
