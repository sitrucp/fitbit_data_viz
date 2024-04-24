# response_log.py
# reads response_log.json file to get dates

import json
import os
from datetime import datetime

# Get response log 
current_dir = os.path.dirname(os.path.abspath(__file__))
LOG_FILE_PATH = os.path.join(current_dir, 'response_log.json')

def write_response_log(module_str, date, status):
    """
    Log the execution of an API request with detailed response status.
    :param module_str: The identifier for the API endpoint.
    :param date: The date of the request as a string.
    :param status: The status of the request ('success', 'failure', or 'rate_limited').
    """
    logs = {}
    if os.path.exists(LOG_FILE_PATH) and os.stat(LOG_FILE_PATH).st_size > 0:
        with open(LOG_FILE_PATH, 'r') as file:
            try:
                logs = json.load(file)
            except json.JSONDecodeError:
                pass

    # This checks if the module has been added to the log yet or not
    if module_str not in logs:
        logs[module_str] = []
    
    # This adds new entries to the module
    log_entry = {'date': date, 'status': status, 'timestamp': datetime.now().strftime("%Y-%m-%d-%H:%M:%S")}
    #logs[module_str].append(log_entry)
    logs[module_str] = [log_entry] 

    with open(LOG_FILE_PATH, 'w') as file:
        json.dump(logs, file, indent=4)

def get_last_response(module_str):
    try:
        if os.path.exists(LOG_FILE_PATH) and os.stat(LOG_FILE_PATH).st_size > 0:
            with open(LOG_FILE_PATH, 'r') as file:
                logs = json.load(file)
        else:
            return None
    except json.JSONDecodeError:
        return None

    # Directly return the date of the last logged response for the given module
    if module_str in logs and logs[module_str]:
        return logs[module_str][0]['date']  # Assumes there is always one log entry per module

    return None

