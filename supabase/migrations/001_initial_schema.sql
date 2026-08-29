-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Applicants table (linked to auth.users)
CREATE TABLE applicants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT NOT NULL,
  gpa NUMERIC(3,2) CHECK (gpa >= 0 AND gpa <= 4.0),
  sat INTEGER CHECK (sat >= 400 AND sat <= 1600),
  act INTEGER CHECK (act >= 1 AND act <= 36),
  income BIGINT CHECK (income >= 0),
  state CHAR(2) NOT NULL,
  major TEXT NOT NULL,
  year TEXT NOT NULL CHECK (year IN ('freshman', 'sophomore', 'junior', 'senior', 'grad')),
  ethnicity TEXT[],
  first_gen BOOLEAN DEFAULT FALSE,
  military BOOLEAN DEFAULT FALSE,
  disability BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_applicants_user_id ON applicants(user_id);

-- Scholarships table (hand-entered seed data)
CREATE TABLE scholarships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  deadline TIMESTAMPTZ NOT NULL,
  url TEXT NOT NULL,
  min_gpa NUMERIC(3,2) CHECK (min_gpa >= 0 AND min_gpa <= 4.0),
  min_sat INTEGER CHECK (min_sat >= 400 AND min_sat <= 1600),
  min_act INTEGER CHECK (min_act >= 1 AND min_act <= 36),
  max_income BIGINT CHECK (max_income >= 0),
  states CHAR(2)[],
  majors TEXT[],
  years TEXT[] CHECK (years <@ ARRAY['freshman', 'sophomore', 'junior', 'senior', 'grad']),
  requires_first_gen BOOLEAN DEFAULT FALSE,
  requires_military BOOLEAN DEFAULT FALSE,
  requires_disability BOOLEAN DEFAULT FALSE,
  requires_ethnicity TEXT[],
  renewable BOOLEAN DEFAULT FALSE,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scholarships_active_deadline ON scholarships(active, deadline) WHERE active = TRUE;
CREATE INDEX idx_scholarships_states ON scholarships USING GIN(states);
CREATE INDEX idx_scholarships_majors ON scholarships USING GIN(majors);

-- Evaluation results cache
CREATE TABLE evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  applicant_id UUID REFERENCES applicants(id) ON DELETE CASCADE,
  scholarship_id UUID REFERENCES scholarships(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('eligible', 'near-miss', 'rejected')),
  gap_field TEXT,
  gap_required JSONB,
  gap_actual JSONB,
  gap_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(applicant_id, scholarship_id)
);

CREATE INDEX idx_evaluations_applicant ON evaluations(applicant_id);

-- LLM response cache (required: every LLM output cached)
CREATE TABLE llm_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_hash TEXT NOT NULL UNIQUE,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_llm_cache_prompt_hash ON llm_cache(prompt_hash);

-- RLS Policies
ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE scholarships ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_cache ENABLE ROW LEVEL SECURITY;

-- Applicants: users can only see/edit their own
CREATE POLICY "Users can view own applicant profile" ON applicants
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own applicant profile" ON applicants
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own applicant profile" ON applicants
  FOR UPDATE USING (auth.uid() = user_id);

-- Scholarships: public read for active, service role for write
CREATE POLICY "Anyone can view active scholarships" ON scholarships
  FOR SELECT USING (active = TRUE AND deadline > NOW());

-- Evaluations: users can only see their own
CREATE POLICY "Users can view own evaluations" ON evaluations
  FOR SELECT USING (
    applicant_id IN (SELECT id FROM applicants WHERE user_id = auth.uid())
  );

-- LLM Cache: service role only (no direct client access)
CREATE POLICY "Service role full access" ON llm_cache
  FOR ALL USING (auth.role() = 'service_role');

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_applicants_updated_at BEFORE UPDATE ON applicants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_scholarships_updated_at BEFORE UPDATE ON scholarships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();