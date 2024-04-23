# get_ep_vo2max_intraday_by_interval.py

from datetime import date
import etl.get_response as get_response

def get_data(start_date, end_date):
    # Set endpoint parmeters
    module_str = 'get_ep_vo2max_intraday_by_interval'

    # Get VO2 Max Summary by Interval
    # Docs: https://dev.fitbit.com/build/reference/web-api/cardio-fitness-score/get-vo2max-summary-by-interval/
    # https://api.fitbit.com/1/user/-/cardioscore/date/2021-10-25/2021-11-24.json
    # Maximum range: 30 days

    url = f'https://api.fitbit.com/1/user/-/cardioscore/date/start_date/end_date.json'
    endpoint_type = 'interval'
    
    get_response.make_request(start_date, end_date, url, module_str, endpoint_type, max_days=30)

def main():
    # Set start_date and end_date parameters
    start_date = date(2024, 3, 1)
    end_date = date(2024, 4, 30)

    # Call the function with the parameters
    get_data(start_date, end_date)

if __name__ == "__main__":
    main()