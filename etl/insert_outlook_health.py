# insert_ep_outlook_health.py
# upserts outlook health data into MongoDB collection

import os
import sys
import pandas as pd
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
OUTLOOK_HEALTH_FILENAME = "outlook_health_events.csv"

# ─────────────────────────────── MAIN FUNCTION ─────────────────────────────────

def main():
    # Build input file path from config
    input_file = os.path.join(config_app["CSV_OUTPUT_DIR"], OUTLOOK_HEALTH_FILENAME)
    
    # Setup MongoDB connection using the centralized connection function
    db = get_database()
    collection = db["outlook_health_by_date"]
    
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
    for _, row in df.iterrows():
        try:
            # Skip records with missing critical fields
            if pd.isna(row['subject']) or pd.isna(row['start_datetime_est']):
                print(f"Skipping record with missing critical fields: {row['subject'] if not pd.isna(row['subject']) else 'Unknown'}")
                continue
                
            # Create document structure for MongoDB with proper handling of null/empty values
            outlook_document = {
                'date': row['start_date_est'] if not pd.isna(row['start_date_est']) else None,
                'subject': str(row['subject']),
                'start_datetime': row['start_datetime_est'].isoformat() if not pd.isna(row['start_datetime_est']) else None,
                'end_datetime': row['end_datetime_est'].isoformat() if not pd.isna(row['end_datetime_est']) else None,
                'body_text': str(row['body_text']).strip() if not pd.isna(row['body_text']) and str(row['body_text']).strip() else "",
                'source': row['source'],
                'lastModified': datetime.now().isoformat()
            }
            
            # Upsert document using subject and start_datetime as the filter key
            filter_criteria = {
                'subject': outlook_document['subject'], 
                'start_datetime': outlook_document['start_datetime']
            }
            collection.replace_one(filter_criteria, outlook_document, upsert=True)
            records_processed += 1
            
        except Exception as e:
            print(f"Error processing record: {e}")
            print(f"Problematic record: {row['subject'] if not pd.isna(row['subject']) else 'Unknown'}")
    
    # Create or ensure indexes on the relevant fields
    collection.create_index([("start_date", 1)])
    collection.create_index([("subject", 1), ("start_datetime", 1)])
    collection.create_index([("categories", 1)])
    
    # Print success message
    print(f"Outlook health data processing complete. Processed {records_processed} records.")

if __name__ == '__main__':
    main()