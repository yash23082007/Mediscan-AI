# MediscanAI

## Guided symptom intake research prototype

MediscanAI is an early-stage research prototype for guided symptom intake and experimental model estimates. It has not been clinically validated.

It combines:

- a branching symptom questionnaire;
- a machine-learning model that may return up to three estimates when its minimum evidence gate is met;
- deterministic questionnaire red-flag rules;
- and a clinician account workflow to approve, correct, or override a submitted result.

The model estimate is not a diagnosis. Model-backed symptom explanations and cited condition-specific care guidance are currently unavailable.

> **Medical disclaimer:** MediscanAI is an academic prototype for triage assistance and demonstration. It is not a diagnosis, treatment service, emergency service, or replacement for a qualified healthcare professional. It has not been clinically or regulatorily certified.

---

## Project Details

| | |
|---|---|
| **Team** | Yash Vijay — Solo |
| **College / Incubator** | JECRC Foundation, Jaipur |
| **Project** | MediscanAI: Symptom Intake Research Prototype |
| **Focus** | Symptom intake, experimental classification, and clinician review workflow |

---

## The problem

Most online symptom tools have one of two problems:

1. They ask a long, fixed list of questions, so users lose patience or miss important details.
2. They return a result without showing how it was reached or giving a clinician a structured way to review it.

Healthcare is a high-stakes setting. A model should not simply output a disease name and stop. It should communicate uncertainty, show supporting evidence, identify safety concerns, and leave the final decision with a healthcare professional.

---

## My solution

MediscanAI currently provides a four-step workflow:

### 1. Ask

The questionnaire follows a fixed branching path based on the patient's answers. It does not select questions using expected information gain.

### 2. Estimate

The AI engine may return up to three model estimates. It abstains when fewer than two symptoms are detected. The percentages are experimental model estimates, not clinical probabilities.

### 3. Protect

The system provides a disclaimer and deterministic red-flag guidance. The red-flag rules have not been clinically validated.

### 4. Review

The case moves into a role-protected clinician portal. A clinician account can review the symptoms and approve, correct, or override the result. Account holders' qualifications are not independently verified by this prototype.

This prototype combines a branching intake, model estimate, and case review workflow.

---

## Architecture

The complete application is split into four clear layers:

```mermaid
flowchart TB
    Patient["Patient browser"]
    Doctor["Doctor browser"]

    subgraph Frontend["Next.js frontend :3000"]
        PatientUI["Questionnaire, diagnosis, health report"]
        DoctorUI["Doctor queue, review, analytics"]
    end

    subgraph API["Node.js / Express API :3001"]
        Auth["Authentication + RBAC"]
        Validation["Zod validation + rate limiting"]
        Workflow["Questionnaire + diagnosis workflow"]
        Audit["Audit logging"]
    end

    subgraph Storage["MongoDB :27017"]
        Data[("Patients, responses, diagnoses")]
        Feedback[("Doctor feedback + audit logs")]
    end

    subgraph AI["Python / Flask AI engine :5000"]
        Model["Random Forest classifier"]
    end

    Patient --> PatientUI
    Doctor --> DoctorUI
    PatientUI --> Auth
    DoctorUI --> Auth
    Auth --> Validation
    Validation --> Workflow
    Workflow --> Data
    Workflow -->|"Prediction request"| Model
    Workflow --> Feedback
    Audit --> Feedback
```

### What happens during a diagnosis

```text
Patient answers questions
        ↓
Next.js sends the authenticated assessment to the Express API
        ↓
The API validates the request and stores the questionnaire session
        ↓
The Flask service converts responses into a 132-feature symptom vector
        ↓
Random Forest ranks the possible conditions
        ↓
The model returns estimates or abstains when too little evidence is present. Model-backed feature explanations are currently unavailable.
        ↓
The API stores the result and creates a reviewable doctor submission
        ↓
Patient sees a preliminary report; doctor can approve, correct, or override it
```

### Why this architecture is practical

- The frontend, API, database, and AI engine can be developed and deployed independently.
- The API is the control point for authentication, validation, persistence, and audit events.
- The AI engine can be improved without rewriting the patient or doctor interfaces.
- The doctor review layer prevents the model from becoming the final authority.
- Docker Compose provides a reproducible local environment.
- Render and Vercel configuration is included for deployment.

---

## AI/ML implementation

The AI service is a Python Flask microservice using scikit-learn.

| Item | Implementation |
|---|---|
| Classifier | `RandomForestClassifier` |
| Trees | 80 |
| Maximum depth | 20 |
| Training rows | 4,920 |
| Unique training profiles | 304 |
| Symptom features | Read from the loaded model artifact |
| Disease classes | Read from the loaded model artifact |
| Clinical validation | None |
| Model storage | Joblib artifacts |
| Output | Ranked top-three conditions and confidence scores |

The model artifacts are stored in [`ai-engine/saved_models/`](ai-engine/saved_models/):

```text
classifier.joblib
encoder.joblib
feature_names.json
metrics.json
scaler.joblib
```

### Model explanations

Model-backed feature attributions are currently disabled. The application does not claim SHAP explanations or display hand-authored symptom weights as model reasoning.

### Dataset limitations

The training corpus contains synthetic symptom profiles, not patient diagnostic records. Duplicate profiles make naive performance measures unreliable. The model has not been clinically validated; its estimates do not establish clinical validity, fairness, or regulatory approval.

---

## Product workflow

### Patient side

- Register and sign in securely
- Start a guided branching assessment
- Answer focused symptom questions
- View any returned model estimates
- See the model estimate, if returned, or an explicit no-estimate state
- View diagnosis history and health reports

### Doctor side

- Open the protected submissions queue
- Filter and inspect patient cases
- Review symptoms and the model estimate, if present
- Approve, correct, or override the result
- Add clinical notes
- View review and triage analytics

### Safety and privacy

- Passwords are hashed with bcrypt.
- JWT sessions use HTTP-only cookies.
- Allergies and chronic conditions are encrypted with AES-256-GCM before storage; other records are not field-encrypted.
- Role-based access separates patient and doctor capabilities.
- Zod validates selected API inputs.
- Helmet, CORS restrictions, and rate limiting protect the API surface.
- Audit middleware writes important authentication and clinical workflow events as insert-only records; database-level immutability is not configured.

This is a prototype. Production use would require clinical validation, privacy review, threat modelling, managed infrastructure, monitoring, and regulatory assessment.

---

## Technology stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js 16, React 19, App Router |
| Backend | Node.js, Express, Axios, Zod |
| AI engine | Python, Flask, scikit-learn, pandas, NumPy, Joblib |
| Database | MongoDB 7 / MongoDB Atlas |
| Security | bcryptjs, JWT, AES-256-GCM, Helmet, CORS, rate limiting |
| Testing | Jest and Python `unittest` |
| Deployment | Docker Compose, Render, Vercel, Gunicorn |

---

## Repository layout

```text
.
├── ai-engine/                 # Flask API, datasets, model, explanation logic
├── client/                    # Next.js patient and doctor interface
├── database/                  # MongoDB bootstrap, demo seed, legacy SQL seed/schema
├── server/                    # Express API, auth, RBAC, and tests
├── qa-evidence/               # Browser journeys and screenshots
├── docker-compose.yml         # Local multi-service setup
├── render.yaml                # Render backend and AI services
├── vercel.json                # Vercel frontend configuration
├── projectreport.md           # Extended academic report
├── MediscanAI_Presentation.pptx
└── README.md
```

---

## Run locally

### Requirements

- Node.js 18+
- npm
- Python 3.10+
- MongoDB 7 (or MongoDB Atlas), or Docker Desktop

### Recommended: Docker Compose

From the repository root:

```powershell
docker compose up --build
```

Compose starts MongoDB as a single-node replica set because clinician reviews use a transaction. The local database port is bound to loopback only.

Open:

| Service | Address |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:3001 |
| API health | http://localhost:3001/api/health |
| API readiness | http://localhost:3001/api/health/ready |
| AI engine | http://localhost:5000 |
| MongoDB | localhost:27017 |

### Run services separately

Create local configuration, then set `MONGODB_URI` to a private MongoDB connection string. For local Docker MongoDB, start the database and AI service with `docker compose up mongo ai-engine`; use `mongodb://127.0.0.1:27017/mediscan_ai?replicaSet=rs0` for the API process. For Atlas, create a database user with least-privilege access, allowlist the development IP, and put the complete URI in the ignored `.env` file or your deployment secret manager. Never paste the URI into source control or logs.

```powershell
Copy-Item .env.example .env
```

Set `MONGODB_URI` in `.env` before starting the API. The API creates required indexes and loads questionnaire definitions on startup.

Start the AI engine:

```powershell
Set-Location ai-engine
python -m pip install -r requirements.txt
python app.py
```

Start the API in another terminal:

```powershell
Set-Location server
npm install
npm run dev
```

Start the frontend in another terminal:

```powershell
Set-Location client
npm install
npm run dev
```

Then open http://localhost:3000.

Never commit `.env`, credentials, tokens, or real patient information.

### Deployment configuration

The Render Blueprint provisions the API and private AI service. Configure `MONGODB_URI` as a private Render environment variable pointing to MongoDB Atlas (or another reachable MongoDB replica set); the blueprint deliberately does not create a PostgreSQL database. The API ensures MongoDB indexes and questionnaire definitions at startup. The AI runtime is reachable only through Render's private network; the API key is shared through a service reference. The frontend uses a same-origin `/api/*` proxy so refresh cookies remain `HttpOnly` and `SameSite=Strict`. Set `API_ORIGIN` in Vercel to the deployed API's HTTPS origin and set `CORS_ORIGIN` in Render to the deployed frontend origin. The API readiness check remains unhealthy until both MongoDB and the model service respond.

### Database migration note

The API now stores data in MongoDB. No PostgreSQL instance or PostgreSQL credentials were available during this code migration, so existing PostgreSQL records have **not** been copied. `database/schema.sql` and `database/migrations/` are retained as historical PostgreSQL references; they are not used by the MongoDB runtime. Back up and explicitly migrate any existing records before switching a production deployment. Questionnaire definitions are imported from the checked-in `database/seed.sql` into MongoDB during startup.

---

## Verification

The project was verified with:

```powershell
# Backend tests
Set-Location server
npm test

# AI engine unit and HTTP contract tests
Set-Location ..\ai-engine
python -B -m unittest discover -s . -p 'test_*.py'

# Frontend lint and production build
Set-Location ..\client
npm run lint
npm run build

# Real-stack browser acceptance (requires running Postgres, API, AI, and Next.js)
npx playwright install chromium
$env:DEMO_ADMIN_PASSWORD = '<private password of at least 16 characters>'
npm run seed:demo
$env:E2E_ADMIN_PASSWORD = $env:DEMO_ADMIN_PASSWORD
npm run test:e2e
```

The repository includes UI screenshots as visual references. The Playwright acceptance flow exercises registration, assessment, diagnosis persistence, review, and patient status refresh against MongoDB:

- landing page, registration, and login;
- guided branching questionnaire;
- diagnosis and health report;
- doctor overview and submissions;
- doctor analytics; and
- mobile responsive layouts.





## What I would build next

The current prototype establishes the workflow. The next engineering priorities are:

1. externally validate and calibrate model probabilities;
2. measure clinician agreement, review time, false-negative risk, and subgroup performance;
3. add multilingual and accessibility-first experiences;
4. add secure referral and follow-up workflows; and
5. introduce versioned, clinician-approved retraining with dataset governance.

.

---

## Submission files

- [Project presentation](MediscanAI_Presentation.pptx)
- [Extended project report](projectreport.md)
- [QA evidence](qa-evidence/README.md)




---

## License



---

## Final statement

MediscanAI is a research prototype for symptom intake and experimental model estimates. It has not been clinically validated, and model-backed feature explanations are currently unavailable.
