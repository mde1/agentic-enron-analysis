"""
Agent 5: Knowledge Graph Construction
- Builds a network graph from email sender/recipient relationships
- Nodes: unique email addresses with metadata
- Edges: communication links with frequency and suspicion weighting
- Outputs graph data optimized for Three.js 3D rendering
"""

import json
import pandas as pd
import networkx as nx
from collections import defaultdict
from utils.state import PipelineState

# Limit graph size for performance
MAX_NODES = 300
MIN_EDGE_WEIGHT = 2  # only include edges with 2+ emails


def run_agent5(state: PipelineState) -> PipelineState:
    """
    Build a communication knowledge graph from the email dataset.
    Returns nodes and edges optimized for 3D visualization.
    """
    print("🔄 [Agent 5] Building knowledge graph...")

    try:
        df = pd.read_json(state["reviewed_emails_json"], orient="records")
        convicted_persons = state.get("convicted_persons", [])

        # Build convicted email set for node tagging
        convicted_patterns = set()
        convicted_name_map = {}
        for person in convicted_persons:
            for pattern in person.get("email_patterns", []):
                convicted_patterns.add(pattern.lower())
                convicted_name_map[pattern.lower()] = person["name"]

        # Count emails per sender for node sizing
        sender_counts = df["from_clean"].value_counts().to_dict()
        suspicious_sent = df[df["is_suspicious"] == True]["from_clean"].value_counts().to_dict()

        # Find top senders to limit graph size
        top_senders = set(df["from_clean"].value_counts().head(MAX_NODES).index)

        # Build edge weights
        edge_weights: dict[tuple, dict] = defaultdict(lambda: {"count": 0, "suspicious": 0})

        for _, row in df.iterrows():
            sender = str(row.get("from_clean", "")).strip()
            if not sender or sender not in top_senders:
                continue

            to_val = row.get("to_clean", row.get("to", []))
            if isinstance(to_val, str):
                try:
                    recipients = json.loads(to_val) if to_val.startswith("[") else [to_val]
                except Exception:
                    recipients = [to_val]
            elif isinstance(to_val, list):
                recipients = to_val
            else:
                recipients = []

            for recipient in recipients[:5]:  # cap recipients per email
                recipient = str(recipient).strip()
                if not recipient or recipient == sender:
                    continue
                # Only include edges where both endpoints are in top senders
                # (or recipient is a convicted person)
                username = recipient.split("@")[0].lower()
                is_convict = username in convicted_patterns

                key = tuple(sorted([sender, recipient]))
                edge_weights[key]["count"] += 1
                if row.get("is_suspicious"):
                    edge_weights[key]["suspicious"] += 1

        # Filter edges by minimum weight
        filtered_edges = {k: v for k, v in edge_weights.items() if v["count"] >= MIN_EDGE_WEIGHT}

        # Collect all nodes referenced in edges
        edge_nodes = set()
        for src, tgt in filtered_edges.keys():
            edge_nodes.add(src)
            edge_nodes.add(tgt)

        # Build nodes
        nodes = []
        for email in edge_nodes:
            username = email.split("@")[0].lower()
            domain = email.split("@")[1] if "@" in email else "unknown"
            is_convicted = username in convicted_patterns
            convicted_name = convicted_name_map.get(username, "")

            # Determine node type
            if is_convicted:
                node_type = "convicted"
            elif "enron" in domain:
                node_type = "enron_employee"
            elif domain in ["gmail.com", "yahoo.com", "hotmail.com"]:
                node_type = "personal"
            else:
                node_type = "external"

            nodes.append({
                "id": email,
                "label": convicted_name if convicted_name else email.split("@")[0],
                "email": email,
                "type": node_type,
                "convicted": is_convicted,
                "convicted_name": convicted_name,
                "email_count": int(sender_counts.get(email, 0)),
                "suspicious_sent": int(suspicious_sent.get(email, 0)),
            })

        # Build edges list
        edges = []
        for (src, tgt), data in filtered_edges.items():
            edges.append({
                "source": src,
                "target": tgt,
                "weight": data["count"],
                "suspicious_count": data["suspicious"],
                "is_suspicious_link": data["suspicious"] > 0,
            })

        # Sort edges by weight
        edges.sort(key=lambda e: e["weight"], reverse=True)

        print(f"   ✅ Graph built: {len(nodes)} nodes, {len(edges)} edges")
        convicted_nodes = sum(1 for n in nodes if n["convicted"])
        print(f"   Convicted nodes: {convicted_nodes}")

        return {
            **state,
            "graph_nodes": nodes,
            "graph_edges": edges,
            "status": "agent5_complete",
            "progress": 95,
        }

    except Exception as e:
        print(f"   ❌ Agent 5 error: {e}")
        return {
            **state,
            "graph_nodes": [],
            "graph_edges": [],
            "errors": (state.get("errors") or []) + [f"Agent 5: {str(e)}"],
            "status": "agent5_failed",
        }
