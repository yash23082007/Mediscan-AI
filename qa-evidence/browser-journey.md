# End-to-end browser journey

## Preconditions

1. Frontend is running on port 3000.
2. API is running on port 3001.
3. AI engine is healthy on port 5000.
4. Use a unique synthetic email such as `qa+<timestamp>@example.test`.

## Patient acceptance flow

1. Open `/` and verify the clinical disclaimer, emergency notice, and primary registration CTA.
2. Open `/register`, create a patient with age, gender, allergies, and chronic conditions.
3. Verify the user lands on `/dashboard` and sensitive profile fields are readable labels, not ciphertext.
4. Refresh the dashboard and verify protected requests do not flash a session-expired state.
5. Open `/questionnaire`; verify the progress bar, keyboard hints, answer targets, and rationale.
6. Complete the adaptive questionnaire with synthetic answers.
7. Verify `/diagnosis?id=...` renders the primary differential, evidence indicator, precautions, triage guidance, and disclaimer.
8. Open `/health-report`; verify timeline records and print/PDF action.
9. Sign out and verify `/dashboard` redirects to `/login`.
10. Log in again and verify the session survives an API restart when local development persistence is enabled.

## Clinician acceptance flow

1. Log in with a seeded demo clinician account.
2. Verify overview metrics and pending triage submissions.
3. Open a submission and verify patient data is scoped to the selected record.
4. Approve or correct a submission and verify the status changes.
5. Verify analytics reflects the updated review action.

## Responsive acceptance

- At 390px width, bottom navigation remains visible and usable.
- Assessment CTA is full width.
- Diagnosis and health-report content does not overflow horizontally.
- Print output hides navigation and interactive controls.
