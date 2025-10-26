# get_ep_ecg_intraday_by_date.py

from datetime import date

import etl.get_response as get_response


def get_data(start_date, end_date):
    # Set endpoint parmeters
    module_str = "get_ep_ecg_intraday_by_date"

    # Get ECG Log List
    # Docs: https://dev.fitbit.com/build/reference/web-api/electrocardiogram/get-ecg-log-list/
    # https://api.fitbit.com/1/user/-/ecg/list.json?afterDate=2022-09-28&sort=asc&limit=1&offset=0

    url = "https://api.fitbit.com/1/user/-/ecg/list.json?afterDate=loop_date&sort=asc&limit=1&offset=0"
    endpoint_type = "single_date"

    get_response.make_request(
        start_date, end_date, url, module_str, endpoint_type, max_days=None
    )


def main():
    # Set start_date and end_date parameters
    start_date = date(2024, 3, 1)
    end_date = date(2024, 3, 5)

    # Call the function with the parameters
    get_data(start_date, end_date)


if __name__ == "__main__":
    main()
