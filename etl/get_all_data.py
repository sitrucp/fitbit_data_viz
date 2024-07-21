# get_all_data.py
# use to run all of the active get json data and insert modules

from datetime import datetime
import importlib
from etl.response_log import get_last_response

module_names = [
    'etl.get_ep_activities_calories_intraday_by_date',
    'etl.get_ep_activities_distance_intraday_by_date',
    'etl.get_ep_activities_elevation_intraday_by_date',
    'etl.get_ep_activities_floors_intraday_by_date',
    'etl.get_ep_activities_steps_intraday_by_date',
    'etl.get_ep_ecg_intraday_by_date',
    'etl.get_ep_hr_intraday_by_date',
    'etl.get_ep_br_intraday_by_interval',
    'etl.get_ep_hrv_intraday_by_interval',
    'etl.get_ep_sleeplog_by_interval',
    'etl.get_ep_spo2_intraday_by_interval',
    'etl.get_ep_vo2max_intraday_by_interval',
    'etl.get_ep_tempskin_by_date',
    'etl.insert_ep_activities_steps_intraday_by_date',
    'etl.insert_ep_hr_intraday_by_date',
    'etl.insert_ep_br_intraday_by_interval',
    'etl.insert_ep_hrv_intraday_by_interval',
    'etl.insert_ep_sleeplog_by_interval',
    'etl.insert_ep_spo2_intraday_by_interval',
    'etl.insert_ep_vo2max_intraday_by_interval',
    'etl.insert_ep_tempskin_by_date',
    'etl.insert_ep_vo2max_intraday_by_interval',
]

def run_all_modules():
    for module_name in module_names:
        # Dynamically import the module
        module = importlib.import_module(module_name)

        if "get_ep" in module_name:
            last_response_date_str = get_last_response(module_name.replace("etl.", ""))
            start_date = datetime.strptime(last_response_date_str, '%Y-%m-%d').date()
            end_date = datetime.now().date()
            print(f'{module_name} last_response_date_str: {last_response_date_str} start_date: {start_date} end_date: {end_date}')
            module.get_data(start_date, end_date)
        elif "insert_ep" in module_name:
            module.main()
        else:
            print(f"Warning: Unknown module prefix: {module_name}")
        
if __name__ == "__main__":
    run_all_modules()
