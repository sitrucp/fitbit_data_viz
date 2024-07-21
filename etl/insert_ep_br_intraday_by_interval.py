# insert_ep_br_intraday_by_interval.py
# upserts data into MongoDB collection

import json
import glob
import os
from datetime import datetime, timedelta
from pymongo import MongoClient
from etl.response_log import get_last_response
from etl.db_connection import get_database

def main():
    # Define module
    module_name_str = "get_ep_br_intraday_by_interval"

    # Setup MongoDB connection using the centralized connection function
    db = get_database()
    collection = db["br_by_date"]

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
                data = json.load(f)["br"]

                for entry in data:
                    # Renaming and restructuring the document according to new requirements
                    new_document = {
                        'date': entry['dateTime'],
                        'fullSleepBr': entry['value']['fullSleepSummary']['breathingRate'],
                        'remSleepBr': entry['value']['remSleepSummary']['breathingRate'],
                        'deepSleepBr': entry['value']['deepSleepSummary']['breathingRate'],
                        'lightSleepBr': entry['value']['lightSleepSummary']['breathingRate'],
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
