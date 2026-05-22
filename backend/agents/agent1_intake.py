"""
Agent 1: Email Intake & Preprocessing
- Loads the raw Enron email CSV
- Normalizes columns (From, To, Subject, Date)
- Extracts sender/recipient email addresses
- Deduplicates and cleans data
- Produces a clean DataFrame for downstream agents
"""

import pandas as pd
import numpy as np
import re
import json
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from utils.state import PipelineState


def normalize_email(addr: str) -> str:
    """Extract clean email address from potentially messy string."""
    if not isinstance(addr, str):
        return ""
    match = re.search(r"[\w.+-]+@[\w.-]+\.\w+", addr.lower())
    return match.group(0) if match else addr.lower().strip()


def normalize_name_from_email(email: str) -> str:
    """Best-effort name extraction from enron email format (firstname.lastname@enron.com)."""
    local = email.split("@")[0]
    parts = local.replace(".", " ").replace("_", " ").split()
    return " ".join(p.capitalize() for p in parts)


def run_agent1(state: PipelineState, data_path: str) -> PipelineState:
    """
    Load and preprocess the Enron email dataset.
    Returns updated state with cleaned emails as JSON string.
    """
    print("🔄 [Agent 1] Starting email intake...")

    try:
        # Load CSV
        df = pd.read_csv(data_path)
        print(f"   Loaded {len(df):,} raw emails")

        # Normalize column names
        df.columns = [c.strip().lower().replace(" ", "_").replace("-", "_") for c in df.columns]

        # Map common column name variations
        column_map = {
            "message_id": "message_id",
            "date": "date",
            "from": "from",
            "to": "to",
            "subject": "subject",
            "mime_version": "mime_version",
            "content_type": "content_type",
            "content_transfer_encoding": "content_transfer_encoding",
            "x_from": "x_from",
            "x_to": "x_to",
            "x_cc": "x_cc",
            "x_bcc": "x_bcc",
            "x_folder": "x_folder",
            "x_origin": "x_origin",
            "x_filename": "x_filename",
            "is_suspicious": "is_suspicious",
        }
        df = df.rename(columns={k: v for k, v in column_map.items() if k in df.columns})

        # Ensure required columns exist
        for col in ["from", "to", "subject", "date"]:
            if col not in df.columns:
                df[col] = ""

        # Clean email addresses
        df["from_clean"] = df["from"].apply(normalize_email)
        df["to_clean"] = df["to"].apply(
            lambda x: [normalize_email(e) for e in str(x).split(",")][:5]  # cap recipients
            if pd.notna(x) else []
        )

        # Extract display names where available (x_from field)
        df["sender_name"] = df.get("x_from", df["from"]).apply(
            lambda x: str(x).split("<")[0].strip().strip('"') if "<" in str(x) else normalize_name_from_email(str(x))
        )

        # Parse dates
        df["date"] = pd.to_datetime(df["date"], errors="coerce", utc=True)
        df["date_str"] = df["date"].dt.strftime("%Y-%m-%d %H:%M").fillna("Unknown")

        # Normalize subject
        df["subject"] = df["subject"].fillna("(No Subject)").astype(str).str.strip()

        # Ensure is_suspicious exists as bool
        if "is_suspicious" not in df.columns:
            df["is_suspicious"] = False
        df["is_suspicious"] = df["is_suspicious"].fillna(False).astype(bool)

        # Add placeholder columns for downstream agents
        df["convicted"] = False
        df["agent_assessment"] = ""

        # Drop rows with no sender
        df = df[df["from_clean"].str.len() > 0].copy()
        df = df.reset_index(drop=True)

        # Summary stats
        summary = (
            f"Loaded {len(df):,} emails from {df['from_clean'].nunique():,} unique senders. "
            f"Date range: {df['date'].min().strftime('%Y-%m-%d') if not df['date'].isna().all() else 'N/A'} "
            f"to {df['date'].max().strftime('%Y-%m-%d') if not df['date'].isna().all() else 'N/A'}. "
            f"Suspicious emails: {df['is_suspicious'].sum():,}."
        )
        print(f"   ✅ {summary}")

        return {
            **state,
            "emails_json": df.to_json(orient="records", default_handler=str),
            "email_count": len(df),
            "intake_summary": summary,
            "status": "agent1_complete",
            "progress": 20,
        }

    except Exception as e:
        print(f"   ❌ Agent 1 error: {e}")
        return {
            **state,
            "errors": (state.get("errors") or []) + [f"Agent 1: {str(e)}"],
            "status": "agent1_failed",
        }
