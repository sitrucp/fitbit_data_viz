# insert_ep_spo2_intraday_by_interval.py
# upserts data into MongoDB collection

import json
import glob
import os
from datetime import datetime, timedelta
from pymongo import MongoClient
from etl.response_log import get_last_response
from etl.db_connection import get_database
from etl.db_connection import get_database

def compute_daily_average(measurements):
    """Compute the average SpO2 value from a list of measurements."""
    if not measurements:
        return None  # Handle the case of empty measurements
    total_spo2 = sum(m['value'] for m in measurements if 'value' in m)
    average_spo2 = total_spo2 / len(measurements)
    return round(average_spo2, 1)  # Round to one decimal place for readability

def main():
    # Define module
    module_name_str = "get_ep_spo2_intraday_by_interval"

    # Setup MongoDB connection using the centralized connection function
    db = get_database()
    collection = db["spo2_intraday_by_date"]

    # Get json files
    base_dir = os.path.dirname(__file__)  
    data_path = os.path.join(base_dir, '..', 'json_data')
    file_name_str = module_name_str.replace('get_ep_', '', 1)
    pattern = os.path.join(data_path, file_name_str + '_*.json')
    files = glob.glob(pattern)

    # Define specific date to insert
    specific_date_str = "2024-04-11"
    specific_date = datetime.strptime(specific_date_str, '%Y-%m-%d').date()

    for file in files:
        file_date_str = os.path.basename(file).split('_')[-3:]  # Extract date from filename
        file_date_str[-1] = file_date_str[-1].split('.')[0]  # Remove '.json' from the last element
        file_date = datetime.strptime('-'.join(file_date_str), '%Y-%m-%d').date()

        # Process file for specific date 
        if file_date == specific_date:
            with open(file, 'r') as f:
                data = json.load(f)
                for entry in data:
                    # Calculate the average SpO2
                    dailyAverage = compute_daily_average(entry['minutes'])
                    # Renaming and restructuring the document according to new requirements
                    new_document = {
                        'date': entry['dateTime'],
                        'dailyAverage': dailyAverage,
                        'measurements': [{'dateTime': m['minute'], 'spo2': m['value']} for m in entry['minutes']],
                        'lastModified': datetime.now().isoformat()
                    }

                    # Upsert document using 'date' as the filter key
                    filter_criteria = {'date': new_document['date']}
                    collection.replace_one(filter_criteria, new_document, upsert=True)

                # Print success for each file
                file_name = os.path.basename(file)
                print("Inserted:", file_name)

    # Create or ensure an index on the 'date' field to enhance performance
    collection.create_index([("date", 1)])

if __name__ == '__main__':
    main()
