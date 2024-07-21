# get_ep_hrv_intraday_by_interval.py

from datetime import date
import etl.get_response as get_response

def get_data(start_date, end_date):
    # Set endpoint parmeters
    module_str = 'get_ep_hrv_intraday_by_interval'

    # Get HRV Intraday by Interval 
    # https://dev.fitbit.com/build/reference/web-api/intraday/get-hrv-intraday-by-interval/
    # https://api.fitbit.com/1/user/-/hrv/date/2021-10-01/2021-10-04/all.json
    # Maximum range: 30 days

    url = f'https://api.fitbit.com/1/user/-/hrv/date/start_date/end_date/all.json'
    endpoint_type = 'interval'
    
    get_response.make_request(start_date, end_date, url, module_str, endpoint_type, max_days=30)

def main():
    # Set start_date and end_date parameters
    start_date = date(2024, 3, 13)
    end_date = date(2024, 9, 30)

    # Call the function with the parameters
    get_data(start_date, end_date)

if __name__ == "__main__":
    main()