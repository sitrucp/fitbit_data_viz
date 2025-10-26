# insert_ep_spo2_intraday_by_interval.py
# upserts data into MongoDB collection

# to run this independently use
# python -m etl.insert_ep_spo2_intraday_by_interval all

import glob
import json
import os
import sys
from datetime import datetime, timedelta

from etl.db_connection import get_database
from etl.response_log import get_last_response


def compute_daily_aggregates(measurements):
    """Compute the average SpO2 value from a list of measurements."""
    if not measurements:
        return None, None, None

    values = [m["value"] for m in measurements if "value" in m]
    total_spo2 = sum(values)
    daily_average = round(total_spo2 / len(values), 1)
    daily_max = max(values)
    daily_min = min(values)

    return daily_average, daily_max, daily_min


def main():
    # Check for 'all' argument
    process_all = len(sys.argv) > 1 and sys.argv[1].lower() == "all"

    # Define module
    module_name_str = "get_ep_spo2_intraday_by_interval"

    # Setup MongoDB connection
    db = get_database()
    collection = db["spo2_intraday_by_date"]

    # Get json files
    base_dir = os.path.dirname(__file__)
    data_path = os.path.join(base_dir, "..", "json_data")
    file_name_str = module_name_str.replace("get_ep_", "", 1)
    pattern = os.path.join(data_path, file_name_str + "_*.json")
    files = glob.glob(pattern)

    # Define the cutoff date
    if process_all:
        print("[FULL MODE] Processing all JSON files")
        last_response_date = datetime.strptime("1900-01-01", "%Y-%m-%d").date()
    else:
        last_response_date_str = get_last_response(module_name_str)
        last_response_date = datetime.strptime(
            last_response_date_str, "%Y-%m-%d"
        ).date()

    for file in files:
        file_date_str = os.path.basename(file).split("_")[
            -3:
        ]  # Extract date from filename
        file_date_str[-1] = file_date_str[-1].split(".")[
            0
        ]  # Remove '.json' from the last element
        file_date = datetime.strptime("-".join(file_date_str), "%Y-%m-%d").date()

        # Process files starting one day before last response
        if file_date >= last_response_date - timedelta(days=1):
            with open(file, "r") as f:
                data = json.load(f)
                for entry in data:
                    # Calculate the average, max, min SpO2
                    dailyAggregate = compute_daily_aggregates(entry["minutes"])
                    # Renaming and restructuring the document according to new requirements
                    new_document = {
                        "date": entry["dateTime"],
                        "dailyAvg": dailyAggregate[0],
                        "dailyMax": dailyAggregate[1],
                        "dailyMin": dailyAggregate[2],
                        "measurements": [
                            {"dateTime": m["minute"], "spo2": m["value"]}
                            for m in entry["minutes"]
                        ],
                        "lastModified": datetime.now().isoformat(),
                    }

                    # Upsert document using 'date' as the filter key
                    filter_criteria = {"date": new_document["date"]}
                    collection.replace_one(filter_criteria, new_document, upsert=True)

                # Print success for each file
                file_name = os.path.basename(file)
                print("Inserted:", file_name)

    # Create or ensure an index on the 'date' field to enhance performance
    collection.create_index([("date", 1)])


if __name__ == "__main__":
    main()
