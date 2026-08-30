
CREATE TABLE IF NOT EXISTS worker_company_groups_access (
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
    group_id UUID REFERENCES company_groups(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (worker_id, group_id)
);

CREATE TABLE IF NOT EXISTS worker_companies_access (
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (worker_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_worker_groups_access_worker ON worker_company_groups_access(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_companies_access_worker ON worker_companies_access(worker_id);

ALTER TABLE worker_company_groups_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_companies_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for all users" ON worker_company_groups_access FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for all users" ON worker_companies_access FOR ALL USING (true) WITH CHECK (true);
