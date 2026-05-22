"""
Agent 3: Label Convicted Senders
- Takes the convicted persons list from Agent 2
- Matches against the 'from_clean' email addresses in the dataset
- Sets 'convicted' = True for matching rows
- Uses fuzzy name matching for robustness
"""

import json
import pandas as pd
import re
from utils.state import PipelineState


def _extract_username(email: str) -> str:
    """Get the local part of an email address."""
    return email.split("@")[0].lower() if "@" in email else email.lower()


def _names_to_patterns(name: str) -> list[str]:
    """Generate email username patterns from a full name."""
    parts = name.lower().split()
    if len(parts) < 2:
        return [name.lower()]
    first, last = parts[0], parts[-1]
    return [
        f"{first}.{last}",
        f"{first[0]}.{last}",
        f"{first}{last}",
        f"{first[0]}{last}",
        f"{last}.{first}",
        first,
        last,
    ]


def run_agent3(state: PipelineState) -> PipelineState:
    """
    Label emails where sender is a convicted Enron individual.
    Adds 'convicted' boolean column to the DataFrame.
    """
    print("🔄 [Agent 3] Labeling convicted individuals in dataset...")

    try:
        df = pd.read_json(state["emails_json"], orient="records")
        convicted_persons = state.get("convicted_persons", [])

        if not convicted_persons:
            print("   ⚠️  No convicted persons list found — skipping labeling")
            return {**state, "labeled_emails_json": state["emails_json"], "convicted_email_count": 0}

        # Build a lookup set of all patterns to match against
        convicted_patterns: dict[str, str] = {}  # pattern → person name
        for person in convicted_persons:
            name = person.get("name", "")
            # From explicit email patterns
            for pattern in person.get("email_patterns", []):
                convicted_patterns[pattern.lower()] = name
            # From generated name patterns
            for pattern in _names_to_patterns(name):
                convicted_patterns[pattern] = name

        print(f"   Built {len(convicted_patterns)} matching patterns for {len(convicted_persons)} individuals")

        # Ensure convicted column exists
        df["convicted"] = False
        df["convicted_match"] = ""  # which person matched

        match_count = 0
        for idx, row in df.iterrows():
            username = _extract_username(str(row.get("from_clean", "")))
            if username in convicted_patterns:
                df.at[idx, "convicted"] = True
                df.at[idx, "convicted_match"] = convicted_patterns[username]
                match_count += 1

        convicted_senders = df[df["convicted"]]["from_clean"].nunique()
        print(f"   ✅ Labeled {match_count:,} emails from {convicted_senders} convicted individuals")

        # Print breakdown
        if match_count > 0:
            breakdown = df[df["convicted"]].groupby("convicted_match").size().sort_values(ascending=False)
            for person, count in breakdown.head(5).items():
                print(f"      • {person}: {count} emails")

        return {
            **state,
            "labeled_emails_json": df.to_json(orient="records", default_handler=str),
            "convicted_email_count": int(match_count),
            "status": "agent3_complete",
            "progress": 55,
        }

    except Exception as e:
        print(f"   ❌ Agent 3 error: {e}")
        return {
            **state,
            "labeled_emails_json": state.get("emails_json"),
            "convicted_email_count": 0,
            "errors": (state.get("errors") or []) + [f"Agent 3: {str(e)}"],
            "status": "agent3_failed",
        }
