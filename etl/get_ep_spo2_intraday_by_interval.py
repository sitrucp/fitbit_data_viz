# get_ep_spo2_intraday_by_interval.py

from datetime import date
import etl.get_response as get_response

def get_data(start_date, end_date):
    # Set endpoint parmeters
    module_str = 'get_ep_spo2_intraday_by_interval'

    # Get SpO2 Intraday by Interval
    # Docs: https://dev.fitbit.com/build/reference/web-api/intraday/get-spo2-intraday-by-interval/
    # https://api.fitbit.com/1/user/-/spo2/date/2021-10-01/2021-10-04/all.json
    # Maximum range: 30 days

    url = f'https://api.fitbit.com/1/user/-/spo2/date/start_date/end_date/all.json'
    endpoint_type = 'interval'

    get_response.make_request(start_date, end_date, url, module_str, endpoint_type, max_days=30)

def main():
    # Set start_date and end_date parameters
    start_date = date(2023, 6, 1)
    end_date = date(2023, 6, 21)

    # Call the function with the parameters
    get_data(start_date, end_date)

if __name__ == "__main__":
    main()