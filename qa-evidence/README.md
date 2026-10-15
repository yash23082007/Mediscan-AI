# MediscanAI QA Evidence Pack

This folder is the release evidence package for the local web application.

## Contents

- `screenshots/` — browser captures for the public landing page and authenticated patient/clinician flows.
- `videos/` — reserved for MP4/WebM recordings captured during a real browser session.
- `browser-journey.md` — the repeatable end-to-end test script and acceptance criteria.
- `video-storyboard.md` — the approved demo sequence, narration, and privacy checklist.

Screenshots and videos must use synthetic accounts and data. Never capture real patient information,
access tokens, cookies, or database snapshots.

## Local capture

Start the three services from the repository root:

```powershell
cd client; npm run dev
cd ..\server; npm start
cd ..\ai-engine; .\.venv-1\Scripts\python.exe app.py
```

Use a browser at `http://localhost:3000`. Capture desktop and 390px mobile viewport versions.
Name files with the route and viewport, for example:

```text
landing-desktop.png
dashboard-mobile.png
diagnosis-desktop.png
```
