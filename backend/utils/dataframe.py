"""Helpers for moving email DataFrames through pipeline JSON state."""

import json
from typing import Any

import pandas as pd


def dataframe_from_records_json(records_json: str | list | None) -> pd.DataFrame:
    """Parse JSON from DataFrame.to_json(orient='records')."""
    if not records_json:
        return pd.DataFrame()
    data = json.loads(records_json) if isinstance(records_json, str) else records_json
    return pd.DataFrame(data)


def dataframe_to_csv(df: pd.DataFrame, path: str) -> None:
    """Write DataFrame to CSV, serializing list/dict cells."""
    out = df.copy()
    for col in out.columns:
        if out[col].apply(lambda x: isinstance(x, (list, dict))).any():
            out[col] = out[col].apply(
                lambda x: json.dumps(x) if isinstance(x, (list, dict)) else x
            )
    out.to_csv(path, index=False)
