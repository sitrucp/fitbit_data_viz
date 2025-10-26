# insert_ep_activities_steps_intraday_by_date.py
# upserts data into MongoDB collection

# to run this independently use
# python -m etl.insert_ep_activities_steps_intraday_by_date all

import glob
import json
import os
import sys
from datetime import datetime, timedelta

from etl.db_connection import get_database
from etl.response_log import get_last_response


def main():
    # Check for 'all' argument
    process_all = len(sys.argv) > 1 and sys.argv[1].lower() == "all"

    # Define module
    module_name_str = "get_ep_activities_steps_intraday_by_date"

    # Setup MongoDB connection
    db = get_database()
    collection = db["steps_intraday_by_date"]

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
        ]  # ['2024', '03', '30.json']
        file_date_str[-1] = file_date_str[-1].split(".")[0]  # Remove '.json'
        file_date = datetime.strptime("-".join(file_date_str), "%Y-%m-%d").date()

        if file_date >= last_response_date - timedelta(days=1):
            with open(file, "r") as f:
                data = json.load(f)
                if "activities-steps" in data and "activities-steps-intraday" in data:
                    date = data["activities-steps"][0]["dateTime"]
                    total_steps = data["activities-steps"][0]["value"]
                    measurements = []
                    hourly_steps = [0] * 24  # Initialize a list of zeros for 24 hours
                    hour_lt_250_steps = 0
                    hour_gt_250_steps = 0

                    for entry in data["activities-steps-intraday"]["dataset"]:
                        # Create measurements array
                        datetime_plus_time = datetime.strptime(
                            f"{date} {entry['time']}", "%Y-%m-%d %H:%M:%S"
                        )
                        measurements.append(
                            {
                                "dateTime": datetime_plus_time,
                                "steps": int(entry["value"]),
                            }
                        )

                        # Create hourlySteps array
                        hour = int(entry["time"][:2])  # Extracting hour from the time
                        hourly_steps[hour] += int(
                            entry["value"]
                        )  # Sum up steps directly by hour index

                    # Format hourlySteps array
                    formatted_hourly_steps = [
                        {
                            "dateHour": f"{date}T{str(hour).zfill(2)}:00:00",
                            "value": steps,
                        }
                        for hour, steps in enumerate(hourly_steps)
                    ]

                    hour_gt_250_steps = sum(
                        1 for entry in formatted_hourly_steps if entry["value"] >= 250
                    )
                    hour_lt_250_steps = sum(
                        1 for entry in formatted_hourly_steps if entry["value"] < 250
                    )

                    new_document = {
                        "date": date,
                        "totalSteps": int(total_steps),
                        "measurements": measurements,
                        "measurementsHourly": formatted_hourly_steps,
                        "hourGt250Steps": hour_gt_250_steps,
                        "hourLt250Steps": hour_lt_250_steps,
                        "lastModified": datetime.now().isoformat(),
                    }

                    filter_criteria = {"date": new_document["date"]}
                    collection.replace_one(filter_criteria, new_document, upsert=True)

                    print("Inserted:", os.path.basename(file))

    collection.create_index([("date", 1)])


if __name__ == "__main__":
    main()
