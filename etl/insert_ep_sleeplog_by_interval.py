# insert_ep_sleeplog_by_interval.py
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
    module_name_str = "get_ep_sleeplog_by_interval"

    # Setup MongoDB connection using the centralized connection function
    db = get_database()
    collection = db["sleeplog_by_date"]

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
        # Extract date from filename
        file_date_str = os.path.basename(file).split('_')[-3:]  # ['2024', '03', '30.json']
        file_date_str[-1] = file_date_str[-1].split('.')[0]  # Remove '.json' from the last element
        file_date = datetime.strptime('-'.join(file_date_str), '%Y-%m-%d').date()

        # Insert files including files one day before last response date to ensure partial days are updated
        if file_date >= last_response_date - timedelta(days=1):

            with open(file, 'r') as f:
                data = json.load(f)

                # Ensure 'sleep' array exists in your data
                if "sleep" not in data:
                    continue

                # Iterate through each 'sleep' dataset
                for sleep_data in data["sleep"]:
                    # Ensure 'dateOfSleep' exists in your sleep data
                    if 'dateOfSleep' not in sleep_data:
                        continue

                    # Add 'lastModified' timestamp
                    sleep_data['lastModified'] = datetime.now().isoformat()

                    # Convert 'dateOfSleep' to 'date' and format it
                    sleep_data['date'] = datetime.strptime(sleep_data.pop('dateOfSleep'), '%Y-%m-%d').date().isoformat()

                    # Prepare the upsert document by unpacking sleep_data
                    document = {**sleep_data}

                    # Define the filter for the upsert operation using 'date'
                    filter_criteria = {'date': document['date']}

                    # Use replace_one for upsert behavior
                    collection.replace_one(filter_criteria, document, upsert=True)

                # print success
                file_name = os.path.basename(file)
                print("inserted:", file_name)

    # After inserting all documents, create an index on the 'dateOfSleep' field
    collection.create_index([("date", 1)]) 

if __name__ == '__main__':
    main()