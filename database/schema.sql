-- ============================================
-- MediscanAI: PostgreSQL Database Schema
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ============================================
-- PATIENTS TABLE
-- ============================================
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email CITEXT UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    age INTEGER CHECK (age > 0 AND age < 150),
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    weight NUMERIC(5,2) CHECK (weight > 0 AND weight <= 500),
    height NUMERIC(5,2) CHECK (height > 0 AND height <= 300),
    allergies TEXT,               -- AES-256-GCM encrypted
    chronic_conditions TEXT,      -- AES-256-GCM encrypted
    is_synthetic BOOLEAN DEFAULT FALSE,
    role VARCHAR(20) DEFAULT 'patient' CHECK (role = 'patient'),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- DOCTORS TABLE
-- ============================================
CREATE TABLE doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email CITEXT UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    specialization VARCHAR(255) NOT NULL,
    license_number VARCHAR(100),
    role VARCHAR(20) DEFAULT 'doctor' CHECK (role IN ('doctor', 'admin')),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- DECISION TREE NODES TABLE
-- Question bank for the adaptive questionnaire.
-- `code` is a human-readable stable key (e.g. 'primary_concern').
-- `id` is a UUID auto-generated PK.
-- ============================================
CREATE TABLE decision_tree_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    question_text TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    question_type VARCHAR(50) DEFAULT 'single_choice'
        CHECK (question_type IN ('single_choice', 'multiple_choice', 'scale')),
    options JSONB NOT NULL,
    next_node_logic JSONB,
    condition_weights JSONB,
    weight DECIMAL(3,2) DEFAULT 1.0,
    display_order INTEGER DEFAULT 0,
    is_root BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- QUESTIONNAIRE RESPONSES TABLE
-- ============================================
CREATE TABLE questionnaire_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    current_node_code TEXT,           -- server-tracked current question
    responses JSONB NOT NULL DEFAULT '{}'::jsonb,
    decision_path JSONB DEFAULT '[]'::jsonb,
    total_questions INTEGER,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- DIAGNOSES TABLE
-- ============================================
CREATE TABLE diagnoses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    questionnaire_id UUID REFERENCES questionnaire_responses(id),
    conditions JSONB NOT NULL,
    ai_conditions JSONB,              -- immutable snapshot of original AI predictions
    confidence_scores JSONB NOT NULL,
    probability_vector JSONB,         -- full 41-class probabilities for audit/calibration
    explanation TEXT,
    feature_contributions JSONB,
    triage_level VARCHAR(20) DEFAULT 'routine'
        CHECK (triage_level IN ('emergency', 'urgent', 'routine', 'self_care')),
    triage_details JSONB,
    model_version VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_review', 'reviewed', 'approved', 'overridden', 'corrected')),
    reviewed_by UUID REFERENCES doctors(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    is_synthetic BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_questionnaire_diagnosis UNIQUE (questionnaire_id)
);

-- ============================================
-- FEEDBACK / REVIEWS TABLE
-- ============================================
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    diagnosis_id UUID NOT NULL REFERENCES diagnoses(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN ('approve', 'override', 'correct')),
    original_conditions JSONB,
    final_conditions JSONB,           -- doctor's corrected diagnosis (from vocabulary)
    correction JSONB,
    notes TEXT,
    used_for_retraining BOOLEAN DEFAULT FALSE,
    version INTEGER DEFAULT 1,        -- optimistic lock for concurrent review prevention
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT one_review_per_diagnosis UNIQUE (diagnosis_id)
);

-- ============================================
-- AUDIT LOGS TABLE (append-only)
-- ============================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    user_role VARCHAR(20),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_patients_email ON patients(email);
CREATE INDEX idx_doctors_email ON doctors(email);
CREATE INDEX idx_diagnoses_patient ON diagnoses(patient_id);
CREATE INDEX idx_diagnoses_status ON diagnoses(status);
CREATE INDEX idx_diagnoses_triage ON diagnoses(triage_level);
CREATE INDEX idx_diagnoses_created ON diagnoses(created_at);
CREATE INDEX idx_feedback_doctor ON feedback(doctor_id);
CREATE INDEX idx_feedback_diagnosis ON feedback(diagnosis_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
CREATE INDEX idx_questionnaire_patient ON questionnaire_responses(patient_id);
CREATE INDEX idx_decision_tree_code ON decision_tree_nodes(code);
CREATE INDEX idx_decision_tree_category ON decision_tree_nodes(category);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_patients_updated_at
    BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_doctors_updated_at
    BEFORE UPDATE ON doctors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Prevent DELETE on audit_logs
CREATE OR REPLACE FUNCTION prevent_audit_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs cannot be deleted';
END;
$$ language 'plpgsql';

CREATE TRIGGER no_delete_audit_logs
    BEFORE DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_delete();

-- Prevent UPDATE on audit_logs
CREATE OR REPLACE FUNCTION prevent_audit_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs cannot be updated';
END;
$$ language 'plpgsql';

CREATE TRIGGER no_update_audit_logs
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_update();
