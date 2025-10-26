# get_ep_activities_calories_intraday_by_date.py

from datetime import date

import etl.get_response as get_response


def get_data(start_date, end_date):
    # Set endpoint parameters
    module_str = "get_ep_activities_calories_intraday_by_date"

    # Get Activity Intraday by Date - calories
    # Docs: https://dev.fitbit.com/build/reference/web-api/intraday/get-activity-intraday-by-date/
    # https://api.fitbit.com/1/user/-/activities/steps/date/2019-01-01/1d/1min.json
    # https://api.fitbit.com/1/user/-/activities/resource/date/2019-01-01/1d/1min.json
    # Supported resources: calories | distance | elevation | floors | steps

    url = "https://api.fitbit.com/1/user/-/activities/calories/date/loop_date/1d/1min.json"
    endpoint_type = "single_date"

    get_response.make_request(start_date, end_date, url, module_str, endpoint_type)


def main():
    # Set start_date and end_date parameters
    start_date = date(2024, 3, 1)
    end_date = date(2024, 3, 5)

    # Call the function with the parameters
    get_data(start_date, end_date)


if __name__ == "__main__":
    main()
