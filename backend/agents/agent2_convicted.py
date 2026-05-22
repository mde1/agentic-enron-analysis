"""
Agent 2: Convicted Person Identification
- Uses an LLM to research and enumerate all Enron scandal convicts
- Returns structured data: name, role, charges, sentence, email domains
- This data feeds Agent 3's labeling step
"""

import json
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from utils.state import PipelineState


SYSTEM_PROMPT = """You are a forensic research assistant specializing in corporate fraud cases.
Your task is to provide accurate, well-documented information about individuals convicted in the Enron scandal.
Always respond with valid JSON only — no markdown, no preamble."""

RESEARCH_PROMPT = """Research and list ALL individuals who were convicted (found guilty or pleaded guilty) 
in connection with the Enron corporate fraud scandal.

For each person, provide:
- name: Full legal name
- role: Their role at Enron or related company
- charges: Primary charges they were convicted of
- sentence: The sentence they received
- email_patterns: List of likely email username patterns based on their name 
  (e.g. for "Jeffrey Skilling" → ["jeffrey.skilling", "j.skilling", "jskilling"])
- summary: 2-3 sentence summary of their specific role in the fraud

Return a JSON array of objects with these exact keys.
Include executives, traders, bankers, lawyers, and accountants — anyone with a criminal conviction.
Be thorough — include at least 15-20 people if possible."""


def run_agent2(state: PipelineState, llm: ChatOpenAI) -> PipelineState:
    """
    Use LLM to identify all convicted Enron individuals.
    Returns structured list with names and email patterns.
    """
    print("🔄 [Agent 2] Researching convicted Enron individuals...")

    try:
        response = llm.invoke([
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=RESEARCH_PROMPT)
        ])

        raw = response.content.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        convicted_persons = json.loads(raw)
        print(f"   Found {len(convicted_persons)} convicted individuals")

        # Build normalized name list for matching
        convicted_names_normalized = []
        for person in convicted_persons:
            name = person.get("name", "").lower()
            convicted_names_normalized.append(name)
            # Also add email pattern names
            for pattern in person.get("email_patterns", []):
                convicted_names_normalized.append(pattern.lower())

        # Print summary
        for p in convicted_persons[:5]:
            print(f"   • {p['name']} — {p['role']}")
        if len(convicted_persons) > 5:
            print(f"   ... and {len(convicted_persons) - 5} more")

        return {
            **state,
            "convicted_persons": convicted_persons,
            "convicted_names_normalized": convicted_names_normalized,
            "status": "agent2_complete",
            "progress": 40,
        }

    except Exception as e:
        print(f"   ❌ Agent 2 error: {e}")
        # Fallback: hardcoded core convicts
        fallback = _get_fallback_convicts()
        return {
            **state,
            "convicted_persons": fallback,
            "convicted_names_normalized": [p["name"].lower() for p in fallback],
            "errors": (state.get("errors") or []) + [f"Agent 2 (used fallback): {str(e)}"],
            "status": "agent2_fallback",
            "progress": 40,
        }


def _get_fallback_convicts() -> list[dict]:
    """Hardcoded fallback list of major Enron convicts."""
    return [
        {
            "name": "Jeffrey Skilling",
            "role": "CEO",
            "charges": "Conspiracy, securities fraud, insider trading",
            "sentence": "14 years in federal prison",
            "email_patterns": ["jeffrey.skilling", "j.skilling", "jskilling"],
            "summary": "Enron's CEO orchestrated the mark-to-market accounting schemes that inflated revenues. He was convicted of 19 counts of fraud, conspiracy, and insider trading in 2006."
        },
        {
            "name": "Kenneth Lay",
            "role": "Founder and Chairman",
            "charges": "Conspiracy, securities fraud, bank fraud",
            "sentence": "Convicted (died before sentencing)",
            "email_patterns": ["kenneth.lay", "ken.lay", "klay"],
            "summary": "Enron's founder and chairman promoted the company publicly while it was collapsing internally. He was convicted on 10 counts but died of a heart attack before sentencing."
        },
        {
            "name": "Andrew Fastow",
            "role": "CFO",
            "charges": "Conspiracy to commit securities fraud, wire fraud",
            "sentence": "6 years in federal prison",
            "email_patterns": ["andrew.fastow", "a.fastow", "afastow"],
            "summary": "Fastow created the off-balance-sheet partnerships (LJM Cayman, Raptor entities) that hid billions in debt. He cooperated with prosecutors after pleading guilty."
        },
        {
            "name": "Richard Causey",
            "role": "Chief Accounting Officer",
            "charges": "Conspiracy to commit securities fraud",
            "sentence": "5.5 years in federal prison",
            "email_patterns": ["richard.causey", "r.causey", "rcausey"],
            "summary": "As CAO, Causey worked with Fastow to massage financial statements and conceal the company's true financial condition from investors and regulators."
        },
        {
            "name": "Timothy Belden",
            "role": "Head of Energy Trading, West",
            "charges": "Conspiracy to commit wire fraud",
            "sentence": "2 years probation",
            "email_patterns": ["timothy.belden", "tim.belden", "tbelden"],
            "summary": "Led Enron's manipulation of California's electricity markets during the 2000-2001 energy crisis, using schemes like 'Fat Boy', 'Death Star', and 'Ricochet'."
        },
        {
            "name": "John Forney",
            "role": "Energy Trader",
            "charges": "Conspiracy, wire fraud",
            "sentence": "18 months in federal prison",
            "email_patterns": ["john.forney", "j.forney", "jforney"],
            "summary": "Created many of Enron's illegal electricity trading strategies and helped execute market manipulation schemes in California and western U.S. markets."
        },
        {
            "name": "Ben Glisan",
            "role": "Treasurer",
            "charges": "Conspiracy to commit securities and wire fraud",
            "sentence": "5 years in federal prison",
            "email_patterns": ["ben.glisan", "b.glisan", "bglisan"],
            "summary": "First Enron executive to go to prison, pleaded guilty to one count of conspiracy. Was involved in structuring the SPE transactions that hid company debt."
        },
        {
            "name": "Michael Kopper",
            "role": "Managing Director, Global Finance",
            "charges": "Conspiracy to commit wire fraud, money laundering",
            "sentence": "3 years, 1 month in prison",
            "email_patterns": ["michael.kopper", "m.kopper", "mkopper"],
            "summary": "Fastow's deputy who managed the LJM partnerships and personally profited over $10 million through manipulated deals that cost Enron hundreds of millions."
        },
        {
            "name": "Kevin Howard",
            "role": "CFO, Enron Broadband Services",
            "charges": "Fraud, conspiracy",
            "sentence": "Convictions overturned on appeal",
            "email_patterns": ["kevin.howard", "k.howard", "khoward"],
            "summary": "Involved in accounting manipulations within Enron Broadband Services division to inflate revenues and deceive investors about the broadband unit's performance."
        },
        {
            "name": "Rex Shelby",
            "role": "Senior VP, Enron Broadband Services",
            "charges": "Securities fraud, insider trading",
            "sentence": "Charges dismissed after cooperation",
            "email_patterns": ["rex.shelby", "r.shelby", "rshelby"],
            "summary": "Cooperated with federal investigators regarding the broadband unit's fraudulent accounting and misleading statements to analysts and investors."
        },
    ]
