# get_ep_tempskin_by_date.py

from datetime import date

import etl.get_response as get_response


def get_data(start_date, end_date):
    # Set endpoint parmeters
    module_str = "get_ep_tempskin_by_date"

    # Get Skin Temp by Date single value for longest sleep
    # Docs: tbd
    # https://api.fitbit.com/1/user/-/temp/skin/date/2024-04-16.json

    url = "https://api.fitbit.com/1/user/-/temp/skin/date/loop_date.json"
    endpoint_type = "single_date"

    get_response.make_request(
        start_date, end_date, url, module_str, endpoint_type, max_days=None
    )


def main():
    # Set start_date and end_date parameters
    start_date = date(2024, 1, 1)
    end_date = date(2024, 4, 16)

    # Call the function with the parameters
    get_data(start_date, end_date)


if __name__ == "__main__":
    main()
