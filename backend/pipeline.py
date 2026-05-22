"""
LangGraph Pipeline Orchestration
Wires all 5 agents into a directed graph with shared state.

Usage (from backend/):
    python pipeline.py --input data/emails.csv
    python pipeline.py --input data/emails.csv --output data/results.json
"""

import argparse
import json
import os
from pathlib import Path
from dotenv import load_dotenv

from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI

from agents.agent1_intake import run_agent1
from agents.agent2_convicted import run_agent2
from agents.agent3_labeler import run_agent3
from agents.agent4_suspicious import run_agent4
from agents.agent5_graph import run_agent5
from utils.state import PipelineState

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
load_dotenv()


def build_pipeline(data_path: str) -> StateGraph:
    """Construct the LangGraph StateGraph for the full pipeline."""

    llm = ChatOpenAI(
        model="gpt-4o-mini",  # Cost-efficient; swap to gpt-4o for better quality
        temperature=0,
        api_key=os.getenv("OPENAI_API_KEY"),
    )

    # Wrap agents as LangGraph node functions
    def intake_node(state: PipelineState) -> PipelineState:
        return run_agent1(state, data_path)

    def convicted_research_node(state: PipelineState) -> PipelineState:
        return run_agent2(state, llm)

    def label_node(state: PipelineState) -> PipelineState:
        return run_agent3(state)

    def suspicious_review_node(state: PipelineState) -> PipelineState:
        return run_agent4(state, llm)

    def graph_build_node(state: PipelineState) -> PipelineState:
        return run_agent5(state)

    # Build the graph
    workflow = StateGraph(PipelineState)

    workflow.add_node("intake", intake_node)
    workflow.add_node("research_convicts", convicted_research_node)
    workflow.add_node("label_convicted", label_node)
    workflow.add_node("review_suspicious", suspicious_review_node)
    workflow.add_node("build_graph", graph_build_node)

    # Linear pipeline: 1 → 2 → 3 → 4 → 5 → END
    workflow.set_entry_point("intake")
    workflow.add_edge("intake", "research_convicts")
    workflow.add_edge("research_convicts", "label_convicted")
    workflow.add_edge("label_convicted", "review_suspicious")
    workflow.add_edge("review_suspicious", "build_graph")
    workflow.add_edge("build_graph", END)

    return workflow.compile()


def run(data_path: str, output_path: str = "data/results.json") -> dict:
    """Run the full pipeline and return final state."""
    print("\n🚀 Enron Investigator Pipeline Starting")
    print(f"   Data: {data_path}")
    print("=" * 50)

    pipeline = build_pipeline(data_path)

    initial_state: PipelineState = {
        "emails_json": None,
        "email_count": None,
        "intake_summary": None,
        "convicted_persons": None,
        "convicted_names_normalized": None,
        "labeled_emails_json": None,
        "convicted_email_count": None,
        "reviewed_emails_json": None,
        "suspicious_count": None,
        "assessed_count": None,
        "graph_nodes": None,
        "graph_edges": None,
        "errors": [],
        "status": "starting",
        "progress": 0,
    }

    final_state = pipeline.invoke(initial_state)

    print("\n" + "=" * 50)
    print("✅ Pipeline Complete!")
    print(f"   Emails processed: {final_state.get('email_count', 0):,}")
    print(f"   Convicted emails labeled: {final_state.get('convicted_email_count', 0):,}")
    print(f"   Suspicious reviewed: {final_state.get('assessed_count', 0):,}")
    print(f"   Graph nodes: {len(final_state.get('graph_nodes', [])):,}")
    print(f"   Graph edges: {len(final_state.get('graph_edges', [])):,}")
    if final_state.get("errors"):
        print(f"   ⚠️  Errors: {len(final_state['errors'])}")
        for err in final_state["errors"]:
            print(f"      - {err}")

    # Save results
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    # Build API-ready output (exclude large email JSON blobs from main results)
    results = {
        "summary": {
            "email_count": final_state.get("email_count"),
            "intake_summary": final_state.get("intake_summary"),
            "convicted_email_count": final_state.get("convicted_email_count"),
            "suspicious_count": final_state.get("suspicious_count"),
            "assessed_count": final_state.get("assessed_count"),
        },
        "convicted_persons": final_state.get("convicted_persons", []),
        "graph_nodes": final_state.get("graph_nodes", []),
        "graph_edges": final_state.get("graph_edges", []),
        "errors": final_state.get("errors", []),
        "status": final_state.get("status"),
    }

    with open(output_path, "w") as f:
        json.dump(results, f, indent=2, default=str)
    print(f"\n💾 Results saved to: {output_path}")

    # Also save the labeled email CSV for the API to serve
    if final_state.get("reviewed_emails_json"):
        import pandas as pd
        emails_df = pd.read_json(final_state["reviewed_emails_json"], orient="records")
        csv_path = output_path.replace(".json", "_emails.csv")
        emails_df.to_csv(csv_path, index=False)
        print(f"💾 Labeled emails saved to: {csv_path}")

    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the Enron Investigator pipeline")
    parser.add_argument("--input", default="data/emails.csv", help="Path to email CSV")
    parser.add_argument("--output", default="data/results.json", help="Output JSON path")
    args = parser.parse_args()

    run(args.input, args.output)
