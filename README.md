# ⚖️ Mandamus — Judicial Intelligence Command Center

[![Release](https://img.shields.io/badge/release-v1.0.0-blue?style=flat-square)](https://github.com/chv-sneha/Mandamus)
[![Python](https://img.shields.io/badge/python-3.10%2B-blue?style=flat-square&logo=python)](https://www.python.org)
[![Node.js](https://img.shields.io/badge/node-%2018%2B-brightgreen?style=flat-square&logo=node.js)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square)](https://github.com/chv-sneha/Mandamus/actions)

Mandamus is a purpose-built, modular platform that augments judicial workflows with modern ML, retrieval-augmented generation (RAG), secure collaboration, and real-time virtual hearing capabilities. It is designed to increase throughput, improve consistency, and provide auditable decision-support to legal professionals.

Table of Contents
- Project Overview
- Key Features
- Architecture & Data Flow
- Folder Structure (explained)
- Getting Started (dev & prod)
- Configuration & Secrets
- Testing & CI
- Deployment Guides
- Security & Compliance
- Contribution Guide
- Credits & License

## Project Overview

Mandamus helps judicial officers and legal teams process case files faster by using an integrated stack:
- Backend API: `FastAPI` + Python for secure, typed HTTP endpoints and background tasks.
- Frontend: `React 18` + `Vite` for a fast, modular UI experience.
- Real-time: `Socket.io` signaling + WebRTC for video hearings and live collaboration.
- Storage: `Firestore` for real-time state and lightweight persistence; files and large artifacts stored in cloud object storage (configurable).
- ML: Embeddings + RAG search for precedent retrieval, plus a generative model (configurable provider) for drafting assistance.

This repository contains both frontend and backend code along with deployment helpers and documentation to run locally, in staging, and in production.

## Key Features
- Neural Summarization: Automated fact extraction and structured summaries from heterogeneous legal documents.
- RAG Precedent Search: High-precision semantic retrieval of relevant precedents using embeddings.
- Draft Generator: Assistive draft creation with versioning and auditable change history (IJAT).
- Virtual Hearings: Low-latency signaling and WebRTC-enabled hearing rooms.
- Smart Scheduler: Analytics-driven scheduling to minimize adjournments.
- Secure by Design: Encryption-at-rest, TLS, role-based access control, and configurable deployment for on-premise or sovereign cloud.

## Architecture & Data Flow

High-level architecture (simplified):

```mermaid
flowchart LR
  subgraph Ingest
    A[Document Store / Uploads] --> B[OCR & Preprocessing]
  end

  subgraph Intelligence
    B --> C[Embeddings Service]
    B --> D[Generative LLM (Bedrock / Other)]
    C --> E[RAG Retrieval]
    D --> F[Drafting & Summarization]
  end

  subgraph Application
    E --> G[Precedent Finder UI]
    F --> H[Draft Editor]
    G & H --> I[Review & IJAT]
    I --> J[Scheduler]
    I --> K[Virtual Hearing]
  end

  J --> L[Case Management]
  K --> M[Recording & Evidence Vault]
```

Notes:
- The platform separates compute for sensitive ML tasks and for serving user-facing APIs.
- Embeddings are stored in a vector index (configurable) with access-control at the API layer.

## Folder Structure (detailed)

Top-level layout (key files and directories):

- `backend/` — FastAPI backend and helper scripts.
  - `main.py` — FastAPI application entrypoint.
  - `requirements.txt` — Python dependencies.
  - `firestore-setup.js` and `FIRESTORE_SETUP_README.md` — Firestore provisioning helpers.
  - `precedents_db.json`, `precedents_embeddings_cache.json` — example/prebuilt data used by the RAG pipeline.

- `src/` — React frontend application.
  - `main.jsx`, `App.jsx` — application bootstrapping.
  - `components/` — UI components, grouped by domain (e.g., `PrecedentFinder.jsx`, `DraftGenerator.jsx`, `VirtualHearing/*`).
  - `context/` — React contexts (`AuthContext.jsx`, `MandamusContext.jsx`, `HistoryContext.jsx`).
  - `lib/` — platform utilities and API wrappers (`firebase.js`, `firestoreHelpers.js`, `utils.js`).

- `public/` — static assets such as logos, favicons, and public HTML.

- `backend/signaling/` — Node.js signaling server used for Socket.io if configured separately.

- Docs and deployment: `BACKEND_DEPLOYMENT_GUIDE.md`, `QUICK_DEPLOYMENT.md`, `vercel.json`, `Procfile`, `runtime.txt`.

Why this structure?
- Clear separation of concerns between UI and API.
- `context/` and `lib/` encapsulate cross-cutting concerns like auth and persistence.
- `backend/signaling/` can be deployed independently when scaling real-time traffic.

## Quickstart — Local Development

Prerequisites
- Node.js v18+ and npm
- Python 3.10+
- (Optional) Firebase project and service account for Firestore emulation or real usage

Backend (development)

```bash
# From repository root
cd backend
python -m venv .venv
.\.venv\Scripts\activate    # Windows
pip install -r requirements.txt
# environment variables: see backend/.env.example (create backend/.env)
uvicorn main:app --reload --port 8000
```

Frontend (development)

```bash
cd src
npm install
npm run dev
```

Optional: Signaling server (for WebRTC signaling)

```bash
cd backend/signaling
npm install
node server.js
```

## Environment & Configuration

Configuration is environment-driven. Important variables include:
- `BACKEND_PORT`, `DATABASE_URL`, `FIRESTORE_PROJECT_ID` — backend network and DB.
- `EMBEDDING_PROVIDER`, `EMBEDDING_API_KEY` — embeddings provider configuration.
- `LLM_PROVIDER`, `LLM_API_KEY` — generative model provider (Bedrock, OpenAI, etc.).

Create a `.env` file in `backend/` from `.env.example` and populate secrets. Do NOT commit credentials.

## Testing & CI

- Backend unit tests can be added with `pytest` and run with `pytest -q` from `backend/`.
- Frontend tests use `vitest` and `testing-library/react`.
- CI pipeline (recommended):
  - Run linters (ESLint for JS/TS, flake8/ruff for Python)
  - Run unit tests and coverage
  - Build frontend and run integration smoke tests against a test backend

Suggested GitHub Actions matrix (high-level):

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python: [3.10]
        node: [18]
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v4
        with: python-version: ${{ matrix.python }}
      - name: Set up Node
        uses: actions/setup-node@v4
        with: node-version: ${{ matrix.node }}
      - name: Install backend deps
        run: |
          cd backend
          python -m pip install -r requirements.txt
      - name: Install frontend deps & test
        run: |
          cd src
          npm ci
          npm test --if-present
```

## Production Deployment

This project includes deployment manifests for multiple hosts (Heroku, Vercel). The exact steps depend on your cloud provider and security requirements; the repository contains `Procfile`, `vercel.json`, and `runtime.txt` for quick deployment.

Recommended production checklist:
- Use an encrypted object store for uploaded documents (S3, GCS).
- Run Firestore (or equivalent DB) inside the same region as compute when possible.
- Configure private networking and IAM restrictions for ML/embedding API keys.
- Enable monitoring (Prometheus/Grafana) and centralized logging (ELK, Datadog).

## Security & Compliance

- Data-at-rest: encrypted (AES-256) via cloud provider or disk encryption.
- Data-in-transit: TLS 1.2+ (TLS 1.3 recommended).
- Access control: role-based permissions for judges, clerks, and admin.
- Audit logging: all draft edits and AI suggestions are recorded in IJAT for forensic review.

## Contributing

We welcome contributions. Please follow this workflow:

1. Fork the repository and create a feature branch from `main`.
2. Open a concise issue describing the problem or feature.
3. Run tests and linters locally; include unit tests for new functionality.
4. Submit a pull request with a clear description and related issue number.

Code style:
- Python: `black` + `ruff` for formatting and linting.
- JavaScript: `eslint` + `prettier`.

## Troubleshooting & FAQs

- Q: The frontend cannot reach the backend in dev mode.
  - A: Ensure `VITE_BACKEND_URL` (or equivalent) is set in `src/.env` and backend is running on the configured port.

- Q: WebRTC video fails to connect.
  - A: Confirm signaling server is reachable and STUN/TURN servers are configured.

## Observability & Monitoring

- Add health checks for frontend and backend.
- Export metrics from Python app (Prometheus client) and from Node signaling server.
- Configure alerts for high error-rate, CPU/memory spikes, and queue backlogs.

## Files of Interest

- Backend entry: `backend/main.py`
- Frontend entry: `src/main.jsx` and `src/App.jsx`
- Signaling server (optional): `backend/signaling/server.js`
- Firestore helpers: `src/lib/firestoreHelpers.js`

## License & Credits

This project is released under the MIT License — see the `LICENSE` file for details.

## Maintainers

- Primary: Project Team

