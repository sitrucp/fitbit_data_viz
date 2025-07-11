# insert_bp_by_date.py
# Upserts (or fully recreates) blood‑pressure data into MongoDB.
# ────────────────────────────────────────────────────────────────
# Key changes v2 – May 30 2025
# • SWITCH_DATE_STR hard‑coded to "2024‑09‑01" (user‑tunable)
# • New "arm" field derived from Note + date rule
# • Records with Note == 3 cause the *entire* duplicate set to be dropped
# • Preference order in duplicates: any non‑blank Note row first; rows with
#   blank Note are kept only when no non‑blank Note variant exists
# • Optional full reload via DROP_COLLECTION_FIRST flag (True by default)
# • Keeps original "note" string for traceability

import os
import sys
import glob
from datetime import datetime
from typing import Optional, Tuple

import pandas as pd
from pymongo import MongoClient

from etl.db_connection import get_database

#--- Configurable Variables ---#
# Get KEY_PATH from the environment variable
KEY_PATH = os.getenv("KEY_PATH")

# Ensure KEY_PATH is not None before using it
if KEY_PATH is None:
    raise EnvironmentError("KEY_PATH environment variable not set.")

# Add the KEY_PATH to sys.path
sys.path.insert(0, KEY_PATH)

# Import config file
from config_fitbit import config_app # type: ignore

# ────────────────────────── USER‑TUNABLE CONSTANTS ────────────────────────────
SWITCH_DATE_STR = "2025-01-28"  # Date after which blank‑note readings are LEFT
SWITCH_DATE = datetime.fromisoformat(SWITCH_DATE_STR).date()

DROP_COLLECTION_FIRST = True     # Drop & recreate collection each run

# Blood pressure data constants
NOTE_VALUE_RIGHT_ARM = 2
NOTE_VALUE_DROP_RECORD = 3
DEFAULT_TIME = "12:00 AM"

BP_LEGACY_INPUT_FOLDER = config_app["BP_LEGACY_INPUT_FOLDER"]
BP_USER1_INPUT_FOLDER = config_app["BP_USER1_INPUT_FOLDER"]
BP_USER2_INPUT_FOLDER = config_app["BP_USER2_INPUT_FOLDER"]
BP_OUTPUT_FOLDER = config_app["BP_OUTPUT_FOLDER"]
BP_CSV_OUTPUT_FILE = os.path.join(BP_OUTPUT_FOLDER, "insert_ep_bp_by_date.csv")

# ─────────────────────────────── HELPERS ─────────────────────────────────────

def parse_datetime(date_raw: str, time_raw: str) -> datetime:
    """Robust parse for the Date & Time columns, supporting both YYYY‑MM‑DD
    and MM/DD/YYYY date formats plus optional Time column."""
    if pd.notna(date_raw) and "-" in str(date_raw):  # YYYY‑MM‑DD
        date_str = str(date_raw)
        time_str = time_raw if pd.notna(time_raw) else DEFAULT_TIME
        try:
            return datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %I:%M %p")
        except ValueError:
            return pd.to_datetime(f"{date_str} {time_str}", errors="coerce")
    else:                                           # MM/DD/YYYY fallback
        date_part = date_raw if pd.notna(date_raw) else "01/01/1970"
        time_part = time_raw if pd.notna(time_raw) else DEFAULT_TIME
        return datetime.strptime(f"{date_part} {time_part}", "%m/%d/%Y %I:%M %p")


def derive_arm(note_val: Optional[str | float | int], reading_date: datetime.date) -> str:
    """Return 'left' or 'right' based on note & date rules. Handles numeric and string note values robustly."""
    try:
        # Try to compare numerically for robustness
        if float(note_val) == NOTE_VALUE_RIGHT_ARM:
            return "right"
    except (TypeError, ValueError):
        pass
    # blank note handling
    return "left" if reading_date >= SWITCH_DATE else "right"


def deduplicate_data(df: pd.DataFrame, consider_note: bool) -> pd.DataFrame:
    """Deduplicates data based on specified columns, optionally considering the Note field."""
    dup_key_cols = ["FormattedDate", "Systolic (mm Hg)", "Diastolic (mm Hg)"]
    if consider_note:
        df["note_str"] = df["Note"].astype(str).str.strip()
        df["note_is_blank"] = df["note_str"].eq("")
        df_sorted = df.sort_values(by=["note_is_blank", "source"])
    else:
        df_sorted = df.sort_values(by=["source"])

    before = len(df_sorted)
    df_dedup = df_sorted.drop_duplicates(subset=dup_key_cols, keep="first")
    after = len(df_dedup)
    print(f"Deduplicated {before - after} rows (from {before} - {after})")
    return df_dedup


def load_and_assign_user(folder_path: str, user: str, arm: str) -> pd.DataFrame:
    """Loads CSV files from a folder, assigns a user and arm, and returns a DataFrame."""
    csv_files = glob.glob(os.path.join(folder_path, "*.csv"))
    if not csv_files:
        print(f"No CSV files found in {folder_path}")
        return pd.DataFrame()
    frames = []
    for f in csv_files:
        try:
            df = pd.read_csv(f, skipinitialspace=True)
            df["source"] = os.path.basename(f)
            frames.append(df)
            print(f"Loaded {os.path.basename(f)} ({len(df)} rows) from {user}")
        except Exception as e:
            print(f"Error reading {f}: {e}")
    if not frames:
        print(f"No valid CSV data found in {folder_path} - exiting.")
        return pd.DataFrame()
    df_all = pd.concat(frames, ignore_index=True)
    df_all["user"] = user
    df_all["arm"] = arm
    return df_all


def process_legacy_data(df: pd.DataFrame) -> pd.DataFrame:
    # Parse DateTime
    df["DateTime"] = df.apply(
        lambda r: parse_datetime(r["Date"], r["Time"]), axis=1
    )
    df["FormattedDate"] = df["DateTime"].dt.strftime("%Y-%m-%d")
    df["FormattedTime"] = df["DateTime"].dt.strftime("%I:%M %p")
    df["Time"] = df.apply(
        lambda r: r["Time"] if pd.notna(r["Time"]) else r["FormattedTime"], axis=1
    )
    df["note_str"] = df["Note"].astype(str).str.strip()
    def is_note3(val):
        try:
            return float(val) == NOTE_VALUE_DROP_RECORD
        except (TypeError, ValueError):
            return False
    dup_key_cols = ["FormattedDate", "Systolic (mm Hg)", "Diastolic (mm Hg)"]
    has_note3 = (
        df.groupby(dup_key_cols)["Note"].transform(lambda s: s.apply(is_note3).any())
    )
    df = df[~has_note3]
    df = df[~df["Note"].apply(is_note3)]
    df["arm"] = df.apply(
        lambda r: derive_arm(r["Note"], r["DateTime"].date()), axis=1
    )
    df_dedup = deduplicate_data(df, True)
    return df_dedup


def process_user_data(df: pd.DataFrame, user: str) -> pd.DataFrame:
    # Parse DateTime
    df["DateTime"] = df.apply(
        lambda r: parse_datetime(r["Date"], r["Time"]), axis=1
    )
    df["FormattedDate"] = df["DateTime"].dt.strftime("%Y-%m-%d")
    df["FormattedTime"] = df["DateTime"].dt.strftime("%I:%M %p")
    df["Time"] = df.apply(
        lambda r: r["Time"] if pd.notna(r["Time"]) else r["FormattedTime"], axis=1
    )
    def is_note3(val):
        try:
            return float(val) == NOTE_VALUE_DROP_RECORD
        except (TypeError, ValueError):
            return False
    df = df[~df["Note"].apply(is_note3)]
    df_dedup = deduplicate_data(df, False)
    return df_dedup


# ───────────────────────────── MAIN ETL ──────────────────────────────────────

def main() -> None:
    db = get_database()
    collection = db["bp_by_date"]

    if DROP_COLLECTION_FIRST:
        print("Dropping existing collection bp_by_date")
        collection.drop()

    # Indexes (will be recreated automatically on empty collection)
    collection.create_index([("date", 1)])
    collection.create_index([("date", 1), ("time", 1)])
    collection.create_index([("user", 1)])

    # Load and process legacy data
    df_legacy = load_and_assign_user(BP_LEGACY_INPUT_FOLDER, "legacy", arm="")
    if not df_legacy.empty:
        df_legacy["user"] = "legacy"
        df_legacy_processed = process_legacy_data(df_legacy)
    else:
        df_legacy_processed = pd.DataFrame()

    # Load and process user1 data
    df_user1 = load_and_assign_user(BP_USER1_INPUT_FOLDER, "user1", arm="left")
    if not df_user1.empty:
        df_user1_processed = process_user_data(df_user1, "user1")
    else:
        df_user1_processed = pd.DataFrame()

    # Load and process user2 data
    df_user2 = load_and_assign_user(BP_USER2_INPUT_FOLDER, "user2", arm="right")
    if not df_user2.empty:
        df_user2_processed = process_user_data(df_user2, "user2")
    else:
        df_user2_processed = pd.DataFrame()

    # Combine all data
    frames = [df for df in [df_legacy_processed, df_user1_processed, df_user2_processed] if not df.empty]
    if not frames:
        print("No valid CSV data found - exiting.")
        return
    df_all = pd.concat(frames, ignore_index=True)

    # ───── Insert / upsert into MongoDB ────────────────────────────────────
    for _, row in df_all.iterrows():
        if pd.isna(row["Systolic (mm Hg)"]) or pd.isna(row["Diastolic (mm Hg)"]):
            continue  # skip incomplete vitals

        doc = {
            "date": row["FormattedDate"] if 'FormattedDate' in row else row['Date'],
            "time": row["Time"],
            "systolic": int(row["Systolic (mm Hg)"]),
            "diastolic": int(row["Diastolic (mm Hg)"]),
            "heartRate": int(row["Heart Rate (bpm)"]),
            "riskCategory": str(row["Risk Category Index (American Heart Assoc. 2017)"]) if pd.notna(row["Risk Category Index (American Heart Assoc. 2017)"]) else "",
            "irregularHeartbeat": bool(row["Irregular Heartbeat Detector"]) if pd.notna(row["Irregular Heartbeat Detector"]) else False,
            "note": str(row["Note"]).strip() if pd.notna(row["Note"]) else "",
            "arm": row["arm"],
            "source": row["source"],
            "user": row["user"],
            "lastModified": datetime.now().isoformat(),
        }

        filt = {
            "date": doc["date"],
            "time": doc["time"],
            "systolic": doc["systolic"],
            "diastolic": doc["diastolic"],
            "user": doc["user"],
        }
        collection.replace_one(filt, doc, upsert=True)

    # ───── Save combined CSV for offline audit ────────────────────────────
    df_all.to_csv(BP_CSV_OUTPUT_FILE, index=False)
    print(f"Written - {BP_CSV_OUTPUT_FILE}")


if __name__ == "__main__":
    main()
