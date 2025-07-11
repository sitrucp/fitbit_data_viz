# insert_ep_sleeplog_by_interval.py
# upserts data into MongoDB collection

# insert_ep_sleeplog_by_interval.py
# upserts data into MongoDB collection

import json
import glob
import os
from datetime import datetime, timedelta
from pymongo import MongoClient
from etl.response_log import get_last_response
from etl.db_connection import get_database

def calculate_30day_average(collection, date_str, sleep_stage):
    """
    Calculate 30-day average for a given sleep stage up to (but not including) the given date
    
    Args:
        collection: MongoDB collection
        date_str: Date string in YYYY-MM-DD format
        sleep_stage: Field name for the sleep stage (e.g., 'minutesDeep')
        
    Returns:
        float: 30-day average value, or 0 if no data available
    """
    end_date = datetime.strptime(date_str, '%Y-%m-%d')
    start_date = end_date - timedelta(days=30)
    
    # Query previous 30 days of data
    pipeline = [
        {
            '$match': {
                'date': {
                    '$gte': start_date.strftime('%Y-%m-%d'),
                    '$lt': date_str
                },
                sleep_stage: {'$exists': True}
            }
        },
        {
            '$group': {
                '_id': None,
                'avgValue': {'$avg': f'${sleep_stage}'}
            }
        }
    ]
    
    result = list(collection.aggregate(pipeline))
    if result and 'avgValue' in result[0]:
        return round(result[0]['avgValue'], 1)
    return 0

def main():
    # Define module
    module_name_str = "get_ep_sleeplog_by_interval"

    # Setup MongoDB connection
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
        file_date_str = os.path.basename(file).split('_')[-3:]  
        file_date_str[-1] = file_date_str[-1].split('.')[0]  
        file_date = datetime.strptime('-'.join(file_date_str), '%Y-%m-%d').date()

        if file_date >= last_response_date - timedelta(days=1):
            with open(file, 'r') as f:
                data = json.load(f)

                if "sleep" not in data:
                    continue

                for sleep_data in data["sleep"]:
                    if 'dateOfSleep' not in sleep_data:
                        continue

                    sleep_data['lastModified'] = datetime.now().isoformat()
                    sleep_data['date'] = datetime.strptime(sleep_data.pop('dateOfSleep'), '%Y-%m-%d').date().isoformat()

                    # Extract summary data
                    if 'levels' in sleep_data and 'summary' in sleep_data['levels']:
                        summary = sleep_data['levels']['summary']
                        
                        # Add minutes for each sleep stage
                        sleep_data['minutesDeep'] = summary.get('deep', {}).get('minutes', 0)
                        sleep_data['minutesRem'] = summary.get('rem', {}).get('minutes', 0)
                        sleep_data['minutesLight'] = summary.get('light', {}).get('minutes', 0)
                        
                        # Calculate and add 30-day averages
                        sleep_data['minutesDeepAvg30day'] = calculate_30day_average(
                            collection, sleep_data['date'], 'minutesDeep')
                        sleep_data['minutesRemAvg30day'] = calculate_30day_average(
                            collection, sleep_data['date'], 'minutesRem')
                        sleep_data['minutesLightAvg30day'] = calculate_30day_average(
                            collection, sleep_data['date'], 'minutesLight')

                    # Prepare the upsert document
                    document = {**sleep_data}
                    filter_criteria = {'date': document['date']}
                    
                    # Upsert the document
                    collection.replace_one(filter_criteria, document, upsert=True)
                    print(f"Processed {document['date']} - Deep Avg: {document.get('minutesDeepAvg30day')}, "
                          f"REM Avg: {document.get('minutesRemAvg30day')}, "
                          f"Light Avg: {document.get('minutesLightAvg30day')}")

                print("Inserted:", os.path.basename(file))

    # Create index on the date field
    collection.create_index([("date", 1)]) 

if __name__ == '__main__':
    main()