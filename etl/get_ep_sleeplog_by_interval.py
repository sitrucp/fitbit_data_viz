# get_ep_sleeplog_by_interval.py

from datetime import date
import etl.get_response as get_response

def get_data(start_date, end_date):
    # Set endpoint parmeters
    module_str = 'get_ep_sleeplog_by_interval'

    # Get Sleep Log by Date Range
    # https://dev.fitbit.com/build/reference/web-api/sleep/get-sleep-log-by-date-range/
    # alternatively get by date https://api.fitbit.com/1.2/user/-/sleep/date/2020-01-01.json
    # https://api.fitbit.com/1.2/user/-/sleep/date/2020-01-01/2020-01-05.json
    # Maximum range: 100 days

    url = f'https://api.fitbit.com/1.2/user/-/sleep/date/start_date/end_date.json'
    endpoint_type = 'interval'
    
    get_response.make_request(start_date, end_date, url, module_str, endpoint_type, max_days=100)

def main():
    # Set start_date and end_date parameters 
    start_date = date(2013, 8, 25)
    end_date = date(2020, 1, 1)

    # Call the function with the parameters
    get_data(start_date, end_date)

if __name__ == "__main__":
    main()
    
    """
    Interpreting the Sleep Stage and Short Data

    https://dev.fitbit.com/build/reference/web-api/developer-guide/best-practices/#Interpreting-the-Sleep-Stage-and-Short-Data

    When sleep data is displayed through the Web APIs, the data is represented in 2 ways:

    The "data" grouping displays the sleep stages and any wake periods > 3 minutes (180 seconds).
    The "shortData" grouping displays the short wake periods representing physiological awakenings that are <= 3 minutes (180 seconds).
    The “shortData" is separated to provide better visualization when evaluating the sleep data. Even though the short wakes are not included as a wake stage within the “data” grouping, the short wakes should be considered awake. There will be some overlap between the “shortData” and the sleep stage “data”. The “shortData” will take precedence by overriding any of the sleep stages in “data”. Also, the “shortData” is allowed to span over multiple stages. As a result, the “shortData” should be added to the total wake time, and the overlapping time removed from the stage's data resulting in a bisection of the sleep stage.
    """

