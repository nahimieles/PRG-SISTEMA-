
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE public.recruitment_surveys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    access_token TEXT UNIQUE NOT NULL, 
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.recruitment_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID NOT NULL REFERENCES public.recruitment_surveys(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    type TEXT NOT NULL, 
    options JSONB, 
    order_index INTEGER NOT NULL DEFAULT 0,
    is_required BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.recruitment_candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID NOT NULL REFERENCES public.recruitment_surveys(id) ON DELETE CASCADE,
    survey_version INTEGER NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL, 
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'approved', 'rejected')),
    status_updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.recruitment_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES public.recruitment_candidates(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.recruitment_questions(id) ON DELETE CASCADE,
    response_value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    CONSTRAINT unique_candidate_question UNIQUE(candidate_id, question_id) 
);

CREATE INDEX idx_recruit_cand_survey ON public.recruitment_candidates(survey_id);
CREATE INDEX idx_recruit_resp_cand ON public.recruitment_responses(candidate_id);
CREATE INDEX idx_recruit_quest_survey ON public.recruitment_questions(survey_id);

CREATE OR REPLACE FUNCTION update_candidate_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        NEW.status_updated_at = timezone('utc'::text, now());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_candidate_status_updated
    BEFORE UPDATE ON public.recruitment_candidates
    FOR EACH ROW
    EXECUTE FUNCTION update_candidate_status_timestamp();

ALTER TABLE public.recruitment_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on recruitment_surveys" on public.recruitment_surveys FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can do everything on recruitment_questions" on public.recruitment_questions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can do everything on recruitment_candidates" on public.recruitment_candidates FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can do everything on recruitment_responses" on public.recruitment_responses FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public can insert candidates" 
    ON public.recruitment_candidates 
    FOR INSERT 
    WITH CHECK (true); 

CREATE POLICY "Public can insert responses" 
    ON public.recruitment_responses 
    FOR INSERT 
    WITH CHECK (true); 

CREATE POLICY "Public can view active surveys" 
    ON public.recruitment_surveys 
    FOR SELECT 
    USING (is_active = true);

CREATE POLICY "Public can view active survey questions" 
    ON public.recruitment_questions 
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.recruitment_surveys 
            WHERE id = recruitment_questions.survey_id 
            AND is_active = true
        )
    );
