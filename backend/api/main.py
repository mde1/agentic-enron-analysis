"""
FastAPI Backend
Serves pipeline results to the React frontend.
Endpoints:
  GET  /api/summary          - Pipeline run statistics
  GET  /api/convicted        - List of convicted persons with details
  GET  /api/emails           - Paginated, filtered email table
  GET  /api/graph            - Knowledge graph nodes + edges
  POST /api/run              - Trigger a new pipeline run (async)
  GET  /api/status           - Current pipeline run status
"""

import json
import os
import asyncio
import threading
from pathlib import Path
from typing import Optional

import pandas as pd
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Enron Investigator API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

RESULTS_PATH = os.getenv("RESULTS_PATH", "data/results.json")
EMAILS_CSV_PATH = os.getenv("EMAILS_CSV_PATH", "data/results_emails.csv")
DATA_PATH = os.getenv("DATA_PATH", "data/emails.csv")

# In-memory pipeline status
pipeline_status = {"running": False, "progress": 0, "status": "idle", "errors": []}


def _load_results() -> dict:
    if not Path(RESULTS_PATH).exists():
        raise HTTPException(status_code=404, detail="Pipeline results not found. Run the pipeline first.")
    with open(RESULTS_PATH) as f:
        return json.load(f)


def _load_emails() -> pd.DataFrame:
    if not Path(EMAILS_CSV_PATH).exists():
        raise HTTPException(status_code=404, detail="Email CSV not found. Run the pipeline first.")
    return pd.read_csv(EMAILS_CSV_PATH)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/summary")
def get_summary():
    results = _load_results()
    return results.get("summary", {})


@app.get("/api/convicted")
def get_convicted():
    results = _load_results()
    return results.get("convicted_persons", [])


@app.get("/api/emails")
def get_emails(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    convicted_only: bool = False,
    suspicious_only: bool = False,
    search: Optional[str] = None,
    sort_by: str = "date",
    sort_dir: str = "desc",
):
    df = _load_emails()

    # Filters
    if convicted_only:
        df = df[df["convicted"] == True]
    if suspicious_only:
        df = df[df["is_suspicious"] == True]
    if search:
        search_lower = search.lower()
        mask = (
            df["from_clean"].str.lower().str.contains(search_lower, na=False) |
            df["subject"].str.lower().str.contains(search_lower, na=False) |
            df.get("sender_name", pd.Series(dtype=str)).str.lower().str.contains(search_lower, na=False)
        )
        df = df[mask]

    # Sort
    if sort_by in df.columns:
        df = df.sort_values(sort_by, ascending=(sort_dir == "asc"))

    total = len(df)
    start = (page - 1) * page_size
    end = start + page_size
    page_df = df.iloc[start:end]

    # Select columns to return
    cols = [c for c in [
        "from_clean", "sender_name", "to_clean", "subject", "date_str",
        "convicted", "convicted_match", "is_suspicious", "agent_assessment", "x_folder"
    ] if c in page_df.columns]

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
        "data": page_df[cols].fillna("").to_dict(orient="records"),
    }


@app.get("/api/graph")
def get_graph():
    results = _load_results()
    return {
        "nodes": results.get("graph_nodes", []),
        "edges": results.get("graph_edges", []),
    }


class RunRequest(BaseModel):
    data_path: Optional[str] = None


@app.post("/api/run")
def trigger_pipeline(req: RunRequest, background_tasks: BackgroundTasks):
    global pipeline_status
    if pipeline_status["running"]:
        return {"message": "Pipeline already running", "status": pipeline_status}

    data_path = req.data_path or DATA_PATH

    def run_bg():
        global pipeline_status
        pipeline_status = {"running": True, "progress": 0, "status": "starting", "errors": []}
        try:
            from pipeline import run
            results = run(data_path, RESULTS_PATH)
            pipeline_status = {
                "running": False,
                "progress": 100,
                "status": "complete",
                "errors": results.get("errors", []),
            }
        except Exception as e:
            pipeline_status = {
                "running": False,
                "progress": 0,
                "status": "error",
                "errors": [str(e)],
            }

    background_tasks.add_task(run_bg)
    return {"message": "Pipeline started", "status": pipeline_status}


@app.get("/api/status")
def get_status():
    return pipeline_status
