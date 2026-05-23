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


def run_agent1(state: PipelineState, data_path: str, row_limit: int | None = None, convicted_person: str | None = None) -> PipelineState:
    print("🔄 [Agent 1] Starting email intake...")

    try:
        df = pd.read_csv(data_path)
        print(f"   Loaded {len(df):,} raw emails")

        if row_limit is not None:
            df = df.head(row_limit)
            print(f"   ✂️  Capped to {row_limit:,} rows")

        # Normalize column names to lowercase with underscores
        df.columns = [
            c.strip().lower().replace(" ", "_").replace("-", "_")
            for c in df.columns
        ]

        # Rename known columns to internal names
        column_map = {
            "folder_user":                  "folder_user",
            "folder_name":                  "folder_name",
            "message_id":                   "message_id",
            "date":                         "date",
            "from":                         "from",
            "to":                           "to",
            "subject":                      "subject",
            "mime_version":                 "mime_version",
            "content_type":                 "content_type",
            "content_transfer_encoding":    "content_transfer_encoding",
            "x_from":                       "x_from",
            "x_to":                         "x_to",
            "x_cc":                         "x_cc",
            "x_bcc":                        "x_bcc",
            "x_folder":                     "x_folder",
            "x_origin":                     "x_origin",
            "x_filename":                   "x_filename",
            "body":                         "body",
            "cc":                           "cc",
            "bcc":                          "bcc",
            "time":                         "time",
            "attendees":                    "attendees",
            "re":                           "re",
            "source":                       "source",
            "mail_id":                      "mail_id",
            "poi_present":                  "poi_present",
            "suspicious_folders":           "suspicious_folders",
            "sender_type":                  "sender_type",
            "unique_mails_from_sender":     "unique_mails_from_sender",
            "low_comm":                     "low_comm",
            "contains_reply_forwards":      "contains_reply_forwards",
            "label":                        "label",
        }
        df = df.rename(columns={k: v for k, v in column_map.items() if k in df.columns})

        # Ensure required columns exist
        for col in ["from", "to", "subject", "date", "body"]:
            if col not in df.columns:
                df[col] = ""

        # Clean sender email from raw From field
        df["from_clean"] = df["from"].apply(normalize_email)

        # Prefer X-From for display name (it has "Firstname Lastname <email>" format)
        df["sender_name"] = df.get("x_from", df["from"]).apply(
            lambda x: str(x).split("<")[0].strip().strip('"')
            if "<" in str(x) else normalize_name_from_email(str(x))
        )

        # Use X-To for clean recipient display names, fall back to To
        df["to_clean"] = df.get("x_to", df["to"]).apply(
            lambda x: [e.strip() for e in str(x).split(",") if e.strip()][:10]
            if pd.notna(x) and str(x).strip() else []
        )

        # Parse dates
        df["date"] = pd.to_datetime(df["date"], errors="coerce", utc=True)
        df["date_str"] = df["date"].dt.strftime("%Y-%m-%d %H:%M").fillna("Unknown")

        # Normalize subject
        df["subject"] = df["subject"].fillna("(No Subject)").astype(str).str.strip()

        # --- Derive is_suspicious from Suspicious-Folders column ---
        if "suspicious_folders" in df.columns:
            df["is_suspicious"] = (
                df["suspicious_folders"]
                .astype(str)
                .str.strip()
                .str.lower()
                .isin(["true", "1", "yes", "suspicious"])
            ) | (
                df["suspicious_folders"]
                .astype(str)
                .str.lower()
                .str.contains("suspicious", na=False)
            )
            print(f"   Derived is_suspicious from Suspicious-Folders: {df['is_suspicious'].sum():,} flagged")
        else:
            df["is_suspicious"] = False
            print("   ⚠️  No Suspicious-Folders column found — is_suspicious set to False")

        # Normalize other useful boolean/signal columns
        for bool_col in ["low_comm", "contains_reply_forwards", "poi_present"]:
            if bool_col in df.columns:
                df[bool_col] = df[bool_col].astype(str).str.lower().isin(["true", "1", "yes"])

        # Placeholder columns for downstream agents
        df["convicted"] = False
        df["convicted_match"] = ""
        df["agent_assessment"] = ""

        # Drop rows with no sender
        df = df[df["from_clean"].str.len() > 0].copy()
        df = df.reset_index(drop=True)

        # Filter to convicted person if requested
        if convicted_person:
            person_lower = convicted_person.lower()
            mask = (
                df.get("x_from", pd.Series(dtype=str)).str.lower().str.contains(person_lower, na=False) |
                df["from"].str.lower().str.contains(person_lower.split()[0], na=False)
            )
            df = df[mask]
            print(f"   🎯 Filtered to {convicted_person}: {len(df):,} emails")

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
