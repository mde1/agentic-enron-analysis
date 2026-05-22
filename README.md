# 🔍 Enron Investigator

An agentic AI pipeline that analyzes the Enron email dataset using LangGraph multi-agent workflows, identifies convicted individuals, flags suspicious communications, and visualizes relationships in a 3D knowledge graph.

![Dashboard Preview](docs/preview.png)

## 🧠 Agent Pipeline

```
[Agent 1] Email Intake & Preprocessing
    ↓
[Agent 2] Convicted Person Identification (Web Research)
    ↓
[Agent 3] Label Convicted Senders in Dataset
    ↓
[Agent 4] Suspicious Email Review & Assessment
    ↓
[Agent 5] Knowledge Graph Construction
    ↓
[Dashboard] Interactive React Frontend
```

## 🏗️ Architecture

```
enron-investigator/
├── backend/
│   ├── agents/
│   │   ├── agent1_intake.py        # Email parsing & normalization
│   │   ├── agent2_convicted.py     # Identify Enron convicts via LLM
│   │   ├── agent3_labeler.py       # Label convicted in dataset
│   │   ├── agent4_suspicious.py    # Review is_suspicious rows
│   │   └── agent5_graph.py         # Build knowledge graph
│   ├── api/
│   │   └── main.py                 # FastAPI server
│   ├── pipeline.py                 # LangGraph orchestration
│   └── utils/
│       └── state.py                # Shared pipeline state
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Graph3D.jsx          # Three.js knowledge graph
│   │   │   ├── ConvictedCards.jsx   # Interactive person cards
│   │   │   ├── EmailTable.jsx       # Filterable email table
│   │   │   └── PipelineStatus.jsx   # Agent run status
│   │   └── pages/
│   │       └── Dashboard.jsx
│   └── ...
├── scripts/
│   └── run_pipeline.py             # CLI to run full pipeline
├── render.yaml                     # Render deployment config
└── docker-compose.yml
```

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- OpenAI API key (or Anthropic)

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Add your API key
cp .env.example .env
# Edit .env with your OPENAI_API_KEY

# Run the pipeline on your data
python pipeline.py --input data/emails.csv

# Start the API server
uvicorn api.main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## 🌐 Deploy to Render

1. Push to GitHub
2. Connect repo to [Render](https://render.com)
3. Render auto-detects `render.yaml` and deploys both services
4. Add `OPENAI_API_KEY` in Render environment variables

## 📊 Dataset

Place your Enron email CSV at `backend/data/emails.csv`. The pipeline expects columns like: `From`, `To`, `Subject`, `Date`, `X-FileName`, `is_suspicious`.

Download the dataset: [Kaggle - Enron Email Dataset](https://www.kaggle.com/datasets/advaithsrao/enron-fraud-email-dataset/data)

## 🔑 Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key for LLM agents |
| `ANTHROPIC_API_KEY` | Optional: use Claude instead |
| `DATA_PATH` | Path to email CSV (default: `data/emails.csv`) |
| `PORT` | API port (default: 8000) |

## 🛠️ Tech Stack

- **LangGraph** - Multi-agent orchestration
- **LangChain** - LLM abstractions & tools
- **FastAPI** - REST API
- **React + Vite** - Frontend
- **Three.js + react-three-fiber** - 3D knowledge graph
- **Pandas** - Data processing
- **Render** - Cloud deployment
