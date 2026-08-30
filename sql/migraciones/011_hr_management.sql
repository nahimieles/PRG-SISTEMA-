
CREATE TABLE IF NOT EXISTS hr_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    month INTEGER NOT NULL, 
    year INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS hr_trainings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    date DATE NOT NULL,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_vacations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_used INTEGER NOT NULL,
    status TEXT DEFAULT 'approved' CHECK (status IN ('requested', 'approved', 'taken', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE hr_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_vacations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users" ON hr_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON hr_trainings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON hr_vacations FOR ALL TO authenticated USING (true) WITH CHECK (true);
