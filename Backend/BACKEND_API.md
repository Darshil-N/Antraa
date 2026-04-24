# Backend API (Person B Scope)

## Run
1. From this folder, run `powershell -ExecutionPolicy Bypass -File .\run_backend.ps1`
2. Open `http://localhost:8000/docs`

## Core Pipeline Endpoints
- `POST /api/upload-dataset`
- `POST /api/start-pipeline/{job_id}`
- `GET /ws/{job_id}`
- `GET /api/pipeline-status/{job_id}`
- `POST /api/approve-plan/{job_id}`
- `GET /api/results/{job_id}`
- `GET /api/download/{job_id}/{file_type}` where file_type in `synthetic_csv|audit_trail|certificate`
- `POST /api/acknowledge-download/{job_id}`

## Bias Audit Endpoints
- `POST /api/bias-audit/start`
- `GET /ws/bias/{audit_id}`
- `POST /api/bias-audit/confirm/{audit_id}`
- `GET /api/bias-audit/results/{audit_id}`
- `GET /api/bias-audit/download/{audit_id}/{file_type}` where file_type in `report_pdf|findings_json`

## Health
- `GET /api/health`

## Notes
- DuckDB state is stored in `data.db`
- Job files are stored under `tmp_jobs/` and `tmp_bias/`
- Legacy `outputs/result.json` and `outputs/status.json` are still written for compatibility with your existing `frontend.html`
