# insert_ep_hr_intraday_by_date.py
# upserts data into MongoDB collection

import json
import glob
import os
from datetime import datetime, timedelta
from pymongo import MongoClient
from etl.response_log import get_last_response
from etl.db_connection import get_database

def compute_daily_average(measurements):
    if not measurements:
        return None
    total = sum(measurement['heartRate'] for measurement in measurements)
    average = total / len(measurements)
    return round(average, 1)

def main():
    module_name_str = "get_ep_hr_intraday_by_date"

    # Setup MongoDB connection using the centralized connection function
    db = get_database()
    collection = db['hr_intraday_by_date']

    # Get json files
    base_dir = os.path.dirname(__file__)  
    data_path = os.path.join(base_dir, '..', 'json_data')
    file_name_str = module_name_str.replace('get_ep_', '', 1)
    pattern = os.path.join(data_path, file_name_str + '_*.json')
    files = glob.glob(pattern)

    last_response_date_str = get_last_response(module_name_str)
    last_response_date = datetime.strptime(last_response_date_str, '%Y-%m-%d').date()

    for file in files:
        file_date_str = os.path.basename(file).split('_')[-3:]
        file_date_str[-1] = file_date_str[-1].split('.')[0]
        file_date = datetime.strptime('-'.join(file_date_str), '%Y-%m-%d').date()

        if file_date >= last_response_date - timedelta(days=1):
            with open(file, 'r') as f:
                data = json.load(f)
                
                if "activities-heart" in data and "activities-heart-intraday" in data:
                    date = data['activities-heart'][0]['dateTime']
                    restingHeartRate = data["activities-heart"][0]["value"]["restingHeartRate"]
                    measurements = []
                    
                    for entry in data["activities-heart-intraday"]["dataset"]:
                        datetime_plus_time = datetime.strptime(f"{data['activities-heart'][0]['dateTime']} {entry['time']}", '%Y-%m-%d %H:%M:%S')
                        datetime_plus_time_str = datetime_plus_time.strftime('%Y-%m-%dT%H:%M:%S')
                        measurements.append({'dateTime': datetime_plus_time_str, 'heartRate': entry['value']})
                    
                    daily_average = compute_daily_average(measurements)

                    new_document = {
                        'date': date,
                        'restingHeartRate': restingHeartRate,
                        'dailyAverage': daily_average,
                        'measurements': measurements,
                        'lastModified': datetime.now()
                    }

                    filter_criteria = {'date': data['activities-heart'][0]['dateTime']}
                    collection.replace_one(filter_criteria, new_document, upsert=True)
                    
                    # print success
                    file_name = os.path.basename(file)
                    print("inserted:", file_name)

    collection.create_index([("date", 1)])

if __name__ == '__main__':
    main()
