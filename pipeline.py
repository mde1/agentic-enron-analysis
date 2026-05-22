"""Convenience entrypoint — delegates to backend/pipeline.py."""
import subprocess
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent / "backend"
raise SystemExit(
    subprocess.call(
        [sys.executable, str(BACKEND / "pipeline.py"), *sys.argv[1:]],
        cwd=BACKEND,
    )
)
