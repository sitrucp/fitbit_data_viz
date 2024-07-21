# insert_ep_hrv_intraday_by_interval.py
# upserts data into MongoDB collection

import json
import glob
import os
from datetime import datetime, timedelta
from pymongo import MongoClient
from etl.response_log import get_last_response
from etl.db_connection import get_database

def compute_daily_aggregates(measurements):
    """Compute the average RMSSD value from a list of measurements."""
    if not measurements:
        return None, None, None
    
    values = [m['rmssd'] for m in measurements if 'rmssd' in m]
    total_rmssd = sum(values)
    daily_average = round(total_rmssd / len(values), 1)
    daily_max = max(values)
    daily_min = min(values)

    return daily_average, daily_max, daily_min

def assign_rmssd_bin(rmssd):
    bins = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]  # Include 0 to handle lower boundary
    labels = ['0-10', '10-20', '20-30', '30-40', '40-50', '50-60', '60-70', '70-80', '80-90', '90-100', '100+']

    # Return the label corresponding to the bin into which the rmssd falls
    for i, upper_limit in enumerate(bins):
        if rmssd <= upper_limit:
            return labels[i]  # Correctly return the label corresponding to the bin
    return '100+'  # Handle any rmssd greater than the last specified bin

def main():
    # Define module
    module_name_str = "get_ep_hrv_intraday_by_interval"
    
    # Setup MongoDB connection using the centralized connection function
    db = get_database()
    collection = db["hrv_intraday_by_date"]

    # Get json files
    base_dir = os.path.dirname(__file__)  
    data_path = os.path.join(base_dir, '..', 'json_data')
    file_name_str = module_name_str.replace('get_ep_', '', 1)
    pattern = os.path.join(data_path, file_name_str + '_*.json')
    files = glob.glob(pattern)

    # Get last response date
    last_response_date_str = get_last_response(module_name_str)
    last_response_date = datetime.strptime(last_response_date_str, '%Y-%m-%d').date()

    # Loop through json files
    for file in files:
        # Extract date from filename
        file_date_str = os.path.basename(file).split('_')[-3:]  # ['2024', '03', '30.json']
        file_date_str[-1] = file_date_str[-1].split('.')[0]  # Remove '.json' from the last element
        file_date = datetime.strptime('-'.join(file_date_str), '%Y-%m-%d').date()

        # Insert files including files one day before last response date to ensure partial days are updated
        if file_date >= last_response_date - timedelta(days=1):
            with open(file, 'r') as f:
                data = json.load(f)["hrv"]

                for entry in data:
                    # Flatten each entry in the minutes array
                    measurements = []
                    for minute_entry in entry["minutes"]:
                        rmssd_value = minute_entry["value"]['rmssd']
                        minute_data = {
                            "dateTime": minute_entry["minute"],
                            "rmssd": rmssd_value,
                            "rmssdBinRange": assign_rmssd_bin(rmssd_value),
                            **minute_entry["value"]  # Merge the contents of 'value' into the same level
                        }
                        measurements.append(minute_data)

                    # Calculate the average, max, min SpO2
                    dailyAggregate = compute_daily_aggregates(measurements)
                    
                    # Create new document
                    new_document = {
                        'date': entry['dateTime'], #"date": entry.get("dateTime", ""),  # Fallback to empty string if not present
                        'dailyAverageRmssd': dailyAggregate[0],
                        'dailyMaxRmssd': dailyAggregate[1],
                        'dailyMinRmssd': dailyAggregate[2],
                        'measurements': measurements,
                        'lastModified': datetime.now().isoformat()
                    }

                    # Define the filter for the upsert operation using 'date'
                    filter_criteria = {"date": new_document["date"]}
                    
                    # Use replace_one for upsert behavior
                    collection.replace_one(filter_criteria, new_document, upsert=True)

                # Print success
                file_name = os.path.basename(file)
                print("inserted:", file_name)

    # After inserting all documents, create or ensure an index on the 'date' field to enhance performance
    collection.create_index([("date", 1)])

if __name__ == '__main__':
    main()
