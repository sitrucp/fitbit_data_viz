# insert_ep_outlook_exercise.py
# upserts outlook health data into MongoDB collection with workout type and run duration
# to run manually use  python -m etl.insert_ep_outlook_exercise

import os
import sys
import pandas as pd
import re
from datetime import datetime
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
OUTLOOK_EXERCISE_FILENAME = "outlook_exercise_events.csv"

# ─────────────────────────────── HELPERS ─────────────────────────────────────

def extract_workout_type(subject):
    """Extract workout type from subject line"""
    subject = subject.lower()
    
    # Check for chest and arms pattern
    if re.search(r'chest\s*[&and]*\s*arms', subject):
        return "chest and arms"
    
    # Check for back and shoulders pattern
    if re.search(r'back\s*[&and]*\s*shoulders', subject):
        return "back and shoulders"
    
    # Check for mix/combined workout
    if re.search(r'mix|all|complet|full body', subject):
        return "all"
    
    # French workout ("Bloc d'entraînement")
    if "bloc d'entraînement" in subject:
        return "all"  # Assume it's a full body workout
        
    # If we get here but still have "workout" in the subject, mark as "all"
    if re.search(r'work\s*out|workout|training|gym', subject):
        return "all"
    
    # Default case - couldn't determine
    return None

def extract_run_minutes(subject):
    """Extract running minutes from subject line"""
    subject = subject.lower()
    
    # Pattern for X min/minute run/jog
    run_pattern = re.search(r'(\d+)\s*min(?:ute)?(?:s)?\s*(?:run|jog|slow\s*job|light\s*jog)', subject)
    if run_pattern:
        return int(run_pattern.group(1))
    
    # Special case for "Bloc d'entraînement"
    if "bloc d'entraînement" in subject:
        return 30
        
    # No run information found
    return None

def main():
    # Build input file path from config
    input_file = os.path.join(config_app["CSV_OUTPUT_DIR"], OUTLOOK_EXERCISE_FILENAME)
    
    # Setup MongoDB connection using the centralized connection function
    db = get_database()
    collection = db["outlook_exercise_by_date"]
    
    if not os.path.exists(input_file):
        print(f"CSV file not found: {input_file}")
        return
    
    # These are the input file columns
    # subject,start_datetime_est,end_datetime_est,start_date_est,end_date_est,duration_minutes,categories,body_text

    try:
        # Read the CSV file with NaN for empty fields
        df = pd.read_csv(input_file, skipinitialspace=True)
        
        # Add source file information
        df['source'] = os.path.basename(input_file)
        
        print(f"Read: {input_file}")
        print(f"Total records: {len(df)}")
    except Exception as e:
        print(f"Error reading {input_file}: {e}")
        return

    if df.empty:
        print("No valid data found in CSV file")
        return
    
    # Parse datetime fields to proper format
    for dt_col in ['start_datetime_est', 'end_datetime_est']:
        if dt_col in df.columns:
            df[dt_col] = pd.to_datetime(df[dt_col], errors='coerce')
    
    # Parse date fields to proper format
    for date_col in ['start_date_est', 'end_date_est']:
        if date_col in df.columns:
            df[date_col] = pd.to_datetime(df[date_col], errors='coerce').dt.strftime('%Y-%m-%d')
    
    # Convert duration to integer if possible
    if 'duration_minutes' in df.columns:
        df['duration_minutes'] = pd.to_numeric(df['duration_minutes'], errors='coerce')
    
    # Process each record in the dataframe
    records_processed = 0
    records_skipped = 0
    records_inserted = 0
    records_updated = 0
    error_count = 0

    for _, row in df.iterrows():
        try:
            if pd.isna(row['subject']) or pd.isna(row['start_datetime_est']):
                print(f"Skipping record with missing critical fields: {row['subject'] if not pd.isna(row['subject']) else 'Unknown'}")
                records_skipped += 1
                continue

            subject = str(row['subject'])
            workout_type = extract_workout_type(subject)
            run_minutes = extract_run_minutes(subject)
            outlook_document = {
                'date': row['start_date_est'] if not pd.isna(row['start_date_est']) else None,
                'subject': subject,
                'start_datetime': row['start_datetime_est'].isoformat() if not pd.isna(row['start_datetime_est']) else None,
                'end_datetime': row['end_datetime_est'].isoformat() if not pd.isna(row['end_datetime_est']) else None,
                'duration_minutes': int(row['duration_minutes']) if not pd.isna(row['duration_minutes']) else None,
                'workout_type': workout_type,
                'run_minutes': run_minutes,
                'body_text': str(row['body_text']).strip() if not pd.isna(row['body_text']) and str(row['body_text']).strip() else "",
                'source': row['source'],
                'lastModified': datetime.now().isoformat()
            }
            filter_criteria = {
                'subject': outlook_document['subject'],
                'start_datetime': outlook_document['start_datetime']
            }
            result = collection.replace_one(filter_criteria, outlook_document, upsert=True)
            if result.matched_count == 0 and result.upserted_id is not None:
                records_inserted += 1
            elif result.matched_count > 0:
                records_updated += 1
            records_processed += 1
        except Exception as e:
            print(f"Error processing record: {e}")
            print(f"Problematic record: {row['subject'] if not pd.isna(row['subject']) else 'Unknown'}")
            error_count += 1

    # Create or ensure indexes on the relevant fields
    collection.create_index([("start_date", 1)])
    collection.create_index([("subject", 1), ("start_datetime", 1)])
    collection.create_index([("categories", 1)])
    collection.create_index([("workout_type", 1)])  # New index
    
    # Print summary of operations
    print("\nSummary:")
    print(f"  Processed: {records_processed}")
    print(f"  Inserted: {records_inserted}")
    print(f"  Updated: {records_updated}")
    print(f"  Skipped: {records_skipped}")
    print(f"  Errors: {error_count}")
    print("Outlook exercise data processing complete.")

if __name__ == '__main__':
    main()