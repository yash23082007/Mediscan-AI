-- ============================================
-- AI-Powered Medical Diagnosis System
-- PostgreSQL Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- PATIENTS TABLE
-- ============================================
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    age INTEGER CHECK (age > 0 AND age < 150),
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    weight DECIMAL(5,2),          -- in kg
    height DECIMAL(5,2),          -- in cm
    allergies TEXT,               -- AES-256 encrypted
    chronic_conditions TEXT,      -- AES-256 encrypted
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
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    specialization VARCHAR(255) NOT NULL,
    license_number VARCHAR(100),
    role VARCHAR(20) DEFAULT 'doctor' CHECK (role IN ('doctor', 'admin')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- DECISION TREE NODES TABLE
-- (Adaptive MCQ question bank)
-- ============================================
CREATE TABLE decision_tree_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,  -- e.g., 'general', 'respiratory', 'cardiovascular', 'neurological'
    question_type VARCHAR(50) DEFAULT 'single_choice' CHECK (question_type IN ('single_choice', 'multiple_choice', 'scale')),
    options JSONB NOT NULL,           -- e.g., [{"value": "yes", "label": "Yes"}, {"value": "no", "label": "No"}]
    next_node_logic JSONB,            -- e.g., {"yes": "node-uuid-1", "no": "node-uuid-2"}
    condition_weights JSONB,          -- e.g., {"flu": 0.8, "pneumonia": 0.6, "cold": 0.3}
    weight DECIMAL(3,2) DEFAULT 1.0,  -- importance weight
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
    responses JSONB NOT NULL,         -- {"question_id": "answer_value", ...}
    decision_path JSONB,              -- ordered list of question IDs traversed
    session_duration INTEGER,         -- seconds
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
    conditions JSONB NOT NULL,         -- top 3: [{"name": "Flu", "confidence": 0.85}, ...]
    confidence_scores JSONB NOT NULL,  -- detailed scores per condition
    explanation TEXT,                   -- XAI human-readable explanation
    feature_contributions JSONB,       -- SHAP values: {"fever": 0.35, "cough": 0.28, ...}
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved', 'overridden', 'corrected')),
    reviewed_by UUID REFERENCES doctors(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- FEEDBACK TABLE
-- ============================================
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    diagnosis_id UUID NOT NULL REFERENCES diagnoses(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN ('approve', 'override', 'correct')),
    original_conditions JSONB,         -- snapshot of original AI prediction
    correction JSONB,                  -- doctor's corrected diagnosis
    notes TEXT,                        -- doctor's notes/reasoning
    used_for_retraining BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- AUDIT LOGS TABLE
-- (Append-only — no UPDATE or DELETE)
-- ============================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    user_role VARCHAR(20),
    action VARCHAR(100) NOT NULL,      -- e.g., 'LOGIN', 'REGISTER', 'VIEW_DIAGNOSIS', 'SUBMIT_FEEDBACK'
    resource VARCHAR(100),             -- e.g., 'patient', 'diagnosis', 'feedback'
    resource_id UUID,
    details JSONB,                     -- additional context
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- GAMIFICATION TABLE
-- (Patient health badges & scores)
-- ============================================
CREATE TABLE gamification (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    health_score INTEGER DEFAULT 0 CHECK (health_score >= 0 AND health_score <= 100),
    badges JSONB DEFAULT '[]'::jsonb,  -- [{"name": "Health Conscious", "earned_at": "...", "icon": "..."}]
    total_checkups INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    last_checkup_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_patients_email ON patients(email);
CREATE INDEX idx_doctors_email ON doctors(email);
CREATE INDEX idx_diagnoses_patient ON diagnoses(patient_id);
CREATE INDEX idx_diagnoses_status ON diagnoses(status);
CREATE INDEX idx_feedback_doctor ON feedback(doctor_id);
CREATE INDEX idx_feedback_diagnosis ON feedback(diagnosis_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
CREATE INDEX idx_questionnaire_patient ON questionnaire_responses(patient_id);
CREATE INDEX idx_decision_tree_category ON decision_tree_nodes(category);
CREATE INDEX idx_gamification_patient ON gamification(patient_id);

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
