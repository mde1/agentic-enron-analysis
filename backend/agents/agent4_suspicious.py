"""
Agent 4: Suspicious Email Review
- Reviews rows where is_suspicious = True
- For each suspicious email, LLM determines:
  * Whether it agrees with the suspicious flag
  * Why or why not
  * Severity: LOW / MEDIUM / HIGH / CRITICAL
- Saves analysis to 'agent_assessment' column
- Batches requests to manage API costs
"""

import json
import pandas as pd
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from utils.state import PipelineState
from utils.dataframe import dataframe_from_records_json

SYSTEM_PROMPT = """You are a financial crimes investigator analyzing internal Enron emails.
You have been given emails flagged as suspicious. For each email, assess:
1. Whether you AGREE or DISAGREE the email is suspicious
2. Your reasoning (1-2 sentences)
3. Severity: LOW, MEDIUM, HIGH, or CRITICAL

Respond ONLY with valid JSON. No markdown, no preamble.
Format: {"agree": true/false, "severity": "LOW|MEDIUM|HIGH|CRITICAL", "reasoning": "..."}"""

REVIEW_PROMPT = """Review this Enron email flagged as suspicious:

From: {sender}
To: {recipients}
Date: {date}
Subject: {subject}

Convicted sender: {convicted}

Based on the subject line, sender identity, and context of the Enron fraud scandal,
assess whether this email is genuinely suspicious."""

# How many suspicious emails to review (cost control)
MAX_REVIEWS = 200
BATCH_SIZE = 10


def _build_prompt(row: pd.Series) -> str:
    to_val = row.get("to", "")
    if isinstance(to_val, list):
        recipients = ", ".join(to_val[:3])
    else:
        recipients = str(to_val)[:100]

    return REVIEW_PROMPT.format(
        sender=row.get("from_clean", row.get("from", "Unknown")),
        recipients=recipients,
        date=row.get("date_str", row.get("date", "Unknown")),
        subject=row.get("subject", "(No Subject)"),
        convicted="YES" if row.get("convicted", False) else "NO",
    )


def _parse_assessment(raw: str) -> dict:
    """Safely parse LLM JSON response."""
    try:
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw.strip())
    except Exception:
        return {"agree": True, "severity": "MEDIUM", "reasoning": "Unable to parse assessment."}


def run_agent4(state: PipelineState, llm: ChatOpenAI) -> PipelineState:
    """
    LLM reviews suspicious emails and writes assessment to 'agent_assessment' column.
    """
    print("🔄 [Agent 4] Reviewing suspicious emails...")

    try:
        df = dataframe_from_records_json(state["labeled_emails_json"])

        suspicious_mask = df["is_suspicious"] == True
        suspicious_count = int(suspicious_mask.sum())
        print(f"   Found {suspicious_count:,} suspicious emails to review")

        if suspicious_count == 0:
            return {
                **state,
                "reviewed_emails_json": state["labeled_emails_json"],
                "suspicious_count": 0,
                "assessed_count": 0,
                "status": "agent4_complete",
                "progress": 75,
            }

        # Cap reviews for cost control
        suspicious_df = df[suspicious_mask].head(MAX_REVIEWS)
        assessed = 0

        for idx, row in suspicious_df.iterrows():
            prompt = _build_prompt(row)
            try:
                response = llm.invoke([
                    SystemMessage(content=SYSTEM_PROMPT),
                    HumanMessage(content=prompt)
                ])
                result = _parse_assessment(response.content)
                assessment_str = (
                    f"[{'✅ AGREES' if result.get('agree') else '❌ DISAGREES'}] "
                    f"Severity: {result.get('severity', 'UNKNOWN')} — "
                    f"{result.get('reasoning', '')}"
                )
                df.at[idx, "agent_assessment"] = assessment_str
                assessed += 1

                if assessed % 10 == 0:
                    print(f"   Reviewed {assessed}/{min(suspicious_count, MAX_REVIEWS)} emails...")

            except Exception as e:
                df.at[idx, "agent_assessment"] = f"[ERROR] Could not assess: {str(e)[:100]}"

        print(f"   ✅ Assessed {assessed:,} suspicious emails")

        return {
            **state,
            "reviewed_emails_json": df.to_json(orient="records", default_handler=str),
            "suspicious_count": suspicious_count,
            "assessed_count": assessed,
            "status": "agent4_complete",
            "progress": 75,
        }

    except Exception as e:
        print(f"   ❌ Agent 4 error: {e}")
        return {
            **state,
            "reviewed_emails_json": state.get("labeled_emails_json"),
            "suspicious_count": 0,
            "assessed_count": 0,
            "errors": (state.get("errors") or []) + [f"Agent 4: {str(e)}"],
            "status": "agent4_failed",
        }
