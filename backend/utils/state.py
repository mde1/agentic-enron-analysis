"""
Shared state schema for the LangGraph pipeline.
Each agent reads from and writes to this TypedDict.
"""

from typing import TypedDict, Optional, Any
import pandas as pd


class PipelineState(TypedDict):
    # Agent 1: Raw + cleaned email DataFrame (serialized as JSON string for graph compatibility)
    emails_json: Optional[str]
    email_count: Optional[int]
    intake_summary: Optional[str]

    # Agent 2: Convicted persons research
    convicted_persons: Optional[list[dict]]  # [{name, role, charges, sentence, summary}]
    convicted_names_normalized: Optional[list[str]]  # lowercase for matching

    # Agent 3: Labeling results
    labeled_emails_json: Optional[str]  # emails with 'convicted' column added
    convicted_email_count: Optional[int]

    # Agent 4: Suspicious email review
    reviewed_emails_json: Optional[str]  # emails with 'agent_assessment' column added
    suspicious_count: Optional[int]
    assessed_count: Optional[int]

    # Agent 5: Knowledge graph
    graph_nodes: Optional[list[dict]]  # [{id, label, type, convicted, email_count}]
    graph_edges: Optional[list[dict]]  # [{source, target, weight, suspicious_count}]

    # Pipeline metadata
    errors: Optional[list[str]]
    status: Optional[str]
    progress: Optional[int]  # 0-100
