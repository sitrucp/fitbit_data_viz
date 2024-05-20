# get_ep_hr_intraday_by_date.py

from datetime import date
import etl.get_response as get_response

def get_data(start_date, end_date):
    # Set endpoint parmeters
    module_str = 'get_ep_hr_intraday_by_date'

    # Get Heart Rate Intraday by Date
    # Docs: https://dev.fitbit.com/build/reference/web-api/intraday/get-heartrate-intraday-by-date/
    # https://api.fitbit.com/1/user/-/activities/heart/date/2019-01-01/1d/1min.json

    url = f'https://api.fitbit.com/1/user/-/activities/heart/date/loop_date/1d/1sec.json'
    endpoint_type = 'single_date' 
    
    get_response.make_request(start_date, end_date, url, module_str, endpoint_type, max_days=None)

def main():
    # Set start_date and end_date parameters
    start_date = date(2020, 1, 11)
    end_date = date(2020, 12, 31)

    # Call the function with the parameters
    get_data(start_date, end_date)

if __name__ == "__main__":
    main()