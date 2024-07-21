# insert_ep_vo2max_intraday_by_interval.py
# upserts data into MongoDB collection

import json
import glob
import os
from datetime import datetime, timedelta
from pymongo import MongoClient
from etl.response_log import get_last_response
from etl.db_connection import get_database

def parse_vo2max_range(vo2max_range):
    """Parse the vo2Max range string into high and low values."""
    if '-' in vo2max_range:
        low, high = map(int, vo2max_range.split('-'))
    else:
        low = high = int(vo2max_range)
    return high, low

def main():
    # Define module
    module_name_str = "get_ep_vo2max_intraday_by_interval"

    # Setup MongoDB connection using the centralized connection function
    db = get_database()
    collection = db["vo2max_by_date"]

    # Get json files
    base_dir = os.path.dirname(__file__)  
    data_path = os.path.join(base_dir, '..', 'json_data')
    file_name_str = module_name_str.replace('get_ep_', '', 1)
    pattern = os.path.join(data_path, file_name_str + '_*.json')
    files = glob.glob(pattern)

    # Define the cutoff date
    last_response_date_str = get_last_response(module_name_str)
    last_response_date = datetime.strptime(last_response_date_str, '%Y-%m-%d').date()

    for file in files:
        file_date_str = os.path.basename(file).split('_')[-3:]  # Extract date from filename
        file_date_str[-1] = file_date_str[-1].split('.')[0]  # Remove '.json' from the last element
        file_date = datetime.strptime('-'.join(file_date_str), '%Y-%m-%d').date()

        # Process files starting one day before last response
        if file_date >= last_response_date - timedelta(days=1):
            with open(file, 'r') as f:
                data = json.load(f)
                for entry in data['cardioScore']:
                    vo2MaxHigh, vo2MaxLow = parse_vo2max_range(entry['value']['vo2Max'])
                    # Prepare the document for MongoDB
                    document = {
                        'date': entry['dateTime'],
                        'vo2MaxHigh': vo2MaxHigh,
                        'vo2MaxLow': vo2MaxLow,
                        'lastModified': datetime.now().isoformat()
                    }

                    # Upsert document using 'date' as the filter key
                    filter_criteria = {'date': document['date']}
                    collection.replace_one(filter_criteria, document, upsert=True)

                # Print success for each file
                print("Inserted:", os.path.basename(file))

    # Create or ensure an index on the 'date' field to enhance performance
    collection.create_index([("date", 1)])

if __name__ == '__main__':
    main()
