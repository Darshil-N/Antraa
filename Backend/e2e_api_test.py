import asyncio
import json
import time
from pathlib import Path

import requests
import websockets

BASE_URL = "http://127.0.0.1:8011"
WS_BASE = "ws://127.0.0.1:8011"
BACKEND_DIR = Path(__file__).resolve().parent
SAMPLE_FILE = BACKEND_DIR / "uploads" / "emails.csv"

report = []


def add_result(step, ok, details=""):
    report.append({"step": step, "status": "PASS" if ok else "FAIL", "details": details})


def get_json(url, timeout=60):
    r = requests.get(url, timeout=timeout)
    r.raise_for_status()
    return r.json()


def wait_phase(job_id, target_phases, timeout_seconds=900):
    start = time.time()
    last = None
    while time.time() - start < timeout_seconds:
        try:
            data = get_json(f"{BASE_URL}/api/pipeline-status/{job_id}", timeout=60)
            phase = data.get("job", {}).get("current_phase")
            last = phase
            if phase in target_phases:
                return phase, data
        except Exception:
            pass
        time.sleep(2)
    return last, None


async def ws_expect_event(path, wanted_types, timeout_seconds=120):
    uri = f"{WS_BASE}{path}"
    try:
        async with websockets.connect(uri, open_timeout=20, close_timeout=10) as ws:
            deadline = time.time() + timeout_seconds
            while time.time() < deadline:
                msg = await asyncio.wait_for(ws.recv(), timeout=30)
                event = json.loads(msg)
                event_type = event.get("type")
                if event_type in wanted_types:
                    return True, event
            return False, {"error": "timeout waiting wanted event"}
    except Exception as exc:
        return False, {"error": str(exc)}


def main():
    if not SAMPLE_FILE.exists():
        add_result("precheck.sample_file", False, f"Missing sample file: {SAMPLE_FILE}")
        print(json.dumps(report, indent=2))
        return 1

    # 1. Health
    try:
        data = get_json(f"{BASE_URL}/api/health")
        add_result("GET /api/health", data.get("status") == "healthy", str(data))
    except Exception as exc:
        add_result("GET /api/health", False, str(exc))
        print(json.dumps(report, indent=2))
        return 1

    # 2. Upload
    job_id = None
    upload_columns = []
    try:
        with open(SAMPLE_FILE, "rb") as f:
            r = requests.post(
                f"{BASE_URL}/api/upload-dataset",
                files={"file": (SAMPLE_FILE.name, f, "text/csv")},
                timeout=180,
            )
        r.raise_for_status()
        payload = r.json()
        job_id = payload.get("job_id")
        upload_columns = payload.get("columns", [])
        add_result("POST /api/upload-dataset", bool(job_id), f"job_id={job_id}")
    except Exception as exc:
        add_result("POST /api/upload-dataset", False, str(exc))
        print(json.dumps(report, indent=2))
        return 1

    # 3. Start pipeline
    try:
        r = requests.post(f"{BASE_URL}/api/start-pipeline/{job_id}", timeout=30)
        r.raise_for_status()
        add_result("POST /api/start-pipeline/{job_id}", r.json().get("status") == "started", r.text)
    except Exception as exc:
        add_result("POST /api/start-pipeline/{job_id}", False, str(exc))
        print(json.dumps(report, indent=2))
        return 1

    # 4. WS pipeline endpoint
    ok, ev = asyncio.run(ws_expect_event(f"/ws/{job_id}", {"PHASE_CHANGE", "AWAITING_APPROVAL", "PIPELINE_ERROR"}, timeout_seconds=120))
    add_result("GET /ws/{job_id}", ok, json.dumps(ev)[:500])

    # 5. Wait for approval phase
    phase, _ = wait_phase(job_id, {"AWAITING_APPROVAL", "FAILED"}, timeout_seconds=900)
    add_result("GET /api/pipeline-status/{job_id}", phase == "AWAITING_APPROVAL", f"phase={phase}")
    if phase != "AWAITING_APPROVAL":
        print(json.dumps(report, indent=2))
        return 1

    # 6. Approve
    try:
        approval = {"decisions": [], "synthetic_rows": 200}
        r = requests.post(f"{BASE_URL}/api/approve-plan/{job_id}", json=approval, timeout=60)
        r.raise_for_status()
        add_result("POST /api/approve-plan/{job_id}", r.json().get("status") == "resumed", r.text)
    except Exception as exc:
        add_result("POST /api/approve-plan/{job_id}", False, str(exc))
        print(json.dumps(report, indent=2))
        return 1

    # 7. Wait for complete
    phase, _ = wait_phase(job_id, {"COMPLETE", "FAILED"}, timeout_seconds=1500)
    add_result("pipeline completion", phase == "COMPLETE", f"phase={phase}")
    if phase != "COMPLETE":
        print(json.dumps(report, indent=2))
        return 1

    # 8. Results
    try:
        data = get_json(f"{BASE_URL}/api/results/{job_id}")
        has_downloads = bool(data.get("downloads"))
        add_result("GET /api/results/{job_id}", has_downloads, f"phase={data.get('current_phase')}")
    except Exception as exc:
        add_result("GET /api/results/{job_id}", False, str(exc))
        print(json.dumps(report, indent=2))
        return 1

    # 9. Downloads
    for file_type in ["synthetic_csv", "audit_trail", "certificate"]:
        try:
            r = requests.get(f"{BASE_URL}/api/download/{job_id}/{file_type}", timeout=120)
            ok = r.status_code == 200 and len(r.content) > 0
            add_result(f"GET /api/download/{job_id}/{file_type}", ok, f"bytes={len(r.content)}")
        except Exception as exc:
            add_result(f"GET /api/download/{job_id}/{file_type}", False, str(exc))

    # 10. Acknowledge download
    try:
        r = requests.post(f"{BASE_URL}/api/acknowledge-download/{job_id}", timeout=30)
        r.raise_for_status()
        add_result("POST /api/acknowledge-download/{job_id}", r.json().get("status") == "destruction_scheduled", r.text)
    except Exception as exc:
        add_result("POST /api/acknowledge-download/{job_id}", False, str(exc))

    # 11. Start bias audit (from source job)
    audit_id = None
    try:
        r = requests.post(
            f"{BASE_URL}/api/bias-audit/start",
            data={"source_job_id": job_id},
            timeout=120,
        )
        r.raise_for_status()
        payload = r.json()
        audit_id = payload.get("audit_id")
        add_result("POST /api/bias-audit/start", bool(audit_id), f"audit_id={audit_id}")
    except Exception as exc:
        add_result("POST /api/bias-audit/start", False, str(exc))
        print(json.dumps(report, indent=2))
        return 1

    # 12. WS bias endpoint
    ok, ev = asyncio.run(ws_expect_event(f"/ws/bias/{audit_id}", {"AWAITING_CONFIRMATION", "PIPELINE_ERROR"}, timeout_seconds=120))
    add_result("GET /ws/bias/{audit_id}", ok, json.dumps(ev)[:500])

    # 13. Confirm bias columns
    protected = [upload_columns[0]] if upload_columns else ["col1"]
    outcomes = [upload_columns[-1]] if upload_columns else ["col2"]
    try:
        r = requests.post(
            f"{BASE_URL}/api/bias-audit/confirm/{audit_id}",
            json={"protected_attributes": protected, "outcome_columns": outcomes},
            timeout=60,
        )
        r.raise_for_status()
        add_result("POST /api/bias-audit/confirm/{audit_id}", r.json().get("status") == "resumed", r.text)
    except Exception as exc:
        add_result("POST /api/bias-audit/confirm/{audit_id}", False, str(exc))
        print(json.dumps(report, indent=2))
        return 1

    # 14. Wait bias completion using pipeline-status (shared jobs table)
    phase, _ = wait_phase(audit_id, {"COMPLETE", "FAILED"}, timeout_seconds=900)
    add_result("bias completion", phase == "COMPLETE", f"phase={phase}")

    # 15. Bias results
    try:
        data = get_json(f"{BASE_URL}/api/bias-audit/results/{audit_id}")
        add_result("GET /api/bias-audit/results/{audit_id}", isinstance(data.get("findings"), list), f"findings={len(data.get('findings', []))}")
    except Exception as exc:
        add_result("GET /api/bias-audit/results/{audit_id}", False, str(exc))

    # 16. Bias downloads
    for file_type in ["report_pdf", "findings_json"]:
        try:
            r = requests.get(f"{BASE_URL}/api/bias-audit/download/{audit_id}/{file_type}", timeout=120)
            ok = r.status_code == 200 and len(r.content) > 0
            add_result(f"GET /api/bias-audit/download/{audit_id}/{file_type}", ok, f"bytes={len(r.content)}")
        except Exception as exc:
            add_result(f"GET /api/bias-audit/download/{audit_id}/{file_type}", False, str(exc))

    print(json.dumps(report, indent=2))
    return 0 if all(r["status"] == "PASS" for r in report) else 2


if __name__ == "__main__":
    raise SystemExit(main())
