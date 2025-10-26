# insert_ep_hr_intraday_by_date.py
# upserts data into MongoDB collection

# to run this independently use
# python -m etl.insert_ep_hr_intraday_by_date all

import glob
import json
import os
import sys
from datetime import datetime, timedelta

from etl.db_connection import get_database
from etl.response_log import get_last_response


def compute_daily_aggregates(measurements):
    """Compute the average, max, and min heart rate from a list of measurements."""
    if not measurements:
        return None, None, None
    values = [m["heartRate"] for m in measurements]
    total = sum(values)
    daily_average = round(total / len(values), 1)
    daily_max = max(values)
    daily_min = min(values)
    return daily_average, daily_max, daily_min


bins = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]  # Include 0 to handle lower boundary
labels = [
    "0-10",
    "10-20",
    "20-30",
    "30-40",
    "40-50",
    "50-60",
    "60-70",
    "70-80",
    "80-90",
    "90-100",
    "100+",
]


def assign_hr_bin(heart_rate):
    bins = [40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170]
    labels = [
        "30-40",
        "40-50",
        "50-60",
        "60-70",
        "70-80",
        "80-90",
        "90-100",
        "100-110",
        "110-120",
        "120-130",
        "130-140",
        "140-150",
        "150-160",
        "160-170",
        "170+",
    ]
    # Return the label corresponding to the bin into which the rmssd falls
    for i, upper_limit in enumerate(bins):
        if heart_rate <= upper_limit:
            return labels[i]  # Correctly return the label corresponding to the bin
    return "170+"  # Handle any heart_rate greater than the last specified bin


def main():
    # Check for 'all' argument
    process_all = len(sys.argv) > 1 and sys.argv[1].lower() == "all"

    # Define module
    module_name_str = "get_ep_hr_intraday_by_date"

    # Setup MongoDB connection
    db = get_database()
    collection = db["hr_intraday_by_date"]

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
        file_date_str = os.path.basename(file).split("_")[-3:]
        file_date_str[-1] = file_date_str[-1].split(".")[0]
        file_date = datetime.strptime("-".join(file_date_str), "%Y-%m-%d").date()

        if file_date >= last_response_date - timedelta(days=1):
            with open(file, "r") as f:
                data = json.load(f)

                # if "activities-heart" in data and "activities-heart-intraday" in data:
                if (
                    "activities-heart" in data
                    and data["activities-heart"]
                    and "activities-heart-intraday" in data
                ):
                    date = data["activities-heart"][0]["dateTime"]
                    restingHeartRate = data["activities-heart"][0]["value"].get(
                        "restingHeartRate", None
                    )
                    measurements = []
                    hrBinRanges = []

                    for entry in data["activities-heart-intraday"]["dataset"]:
                        bin_range = assign_hr_bin(entry["value"])
                        datetime_plus_time = datetime.strptime(
                            f"{data['activities-heart'][0]['dateTime']} {entry['time']}",
                            "%Y-%m-%d %H:%M:%S",
                        )
                        datetime_plus_time_str = datetime_plus_time.strftime(
                            "%Y-%m-%dT%H:%M:%S"
                        )
                        measurements.append(
                            {
                                "dateTime": datetime_plus_time_str,
                                "heartRate": entry["value"],
                                "binRange": bin_range,
                            }
                        )
                        hrBinRanges.append(bin_range)

                    # Compute count of heart rates in each zone
                    hr_bin_counts = {
                        bin_range: hrBinRanges.count(bin_range)
                        for bin_range in set(hrBinRanges)
                    }

                    # Prepare the hrZones array object
                    hr_zones = [
                        {"hrBinRange": bin_range, "count": count}
                        for bin_range, count in hr_bin_counts.items()
                    ]

                    daily_average, daily_max, daily_min = compute_daily_aggregates(
                        measurements
                    )

                    minutes_normal = data["activities-heart"][0]["value"][
                        "heartRateZones"
                    ][0].get("minutes", None)
                    minutes_fat_burn = data["activities-heart"][0]["value"][
                        "heartRateZones"
                    ][1].get("minutes", None)
                    minutes_cardio = data["activities-heart"][0]["value"][
                        "heartRateZones"
                    ][2].get("minutes", None)
                    minutes_peak = data["activities-heart"][0]["value"][
                        "heartRateZones"
                    ][3].get("minutes", None)

                    new_document = {
                        "date": date,
                        "restingHeartRate": restingHeartRate,
                        "dailyAverage": daily_average,
                        "dailyMax": daily_max,
                        "dailyMin": daily_min,
                        "minutesNormal": minutes_normal,
                        "minutesFatBurn": minutes_fat_burn,
                        "minutesCardio": minutes_cardio,
                        "minutesPeak": minutes_peak,
                        "countMeasurements": len(measurements),
                        "measurements": measurements,
                        "hrZones": hr_zones,
                        "lastModified": datetime.now().isoformat(),
                    }

                    filter_criteria = {"date": data["activities-heart"][0]["dateTime"]}
                    collection.replace_one(filter_criteria, new_document, upsert=True)

                    # print success
                    file_name = os.path.basename(file)
                    print("inserted:", file_name)

    collection.create_index([("date", 1)])


if __name__ == "__main__":
    main()
