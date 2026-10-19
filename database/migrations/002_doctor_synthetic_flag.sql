-- Mark local demo administrator accounts explicitly; clinician records default real.
ALTER TABLE doctors
    ADD COLUMN IF NOT EXISTS is_synthetic BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE doctors
SET is_synthetic = TRUE,
    is_verified = FALSE,
    license_number = NULL
WHERE email IN (
    'sarah.mitchell@hospital.com',
    'james.rodriguez@hospital.com',
    'emily.chen@hospital.com'
);
