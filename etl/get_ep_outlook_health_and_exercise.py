# get_ep_outlook_health_and_exercise.py

import pandas as pd
import requests
from datetime import datetime, timedelta
import pytz
import sys
import os

#--- Configurable Variables ---#
# Get KEY_PATH from the environment variable
KEY_PATH = os.getenv("KEY_PATH")

# Ensure KEY_PATH is not None before using it
if KEY_PATH is None:
    raise EnvironmentError("KEY_PATH environment variable not set.")

# Add the KEY_PATH to sys.path
sys.path.insert(0, KEY_PATH)

# Import from the now accessible path
from config_msgraph import config_msgraph  # type: ignore
from config_fitbit import config_app # type: ignore

CSV_OUTPUT_DIR = config_app["CSV_OUTPUT_DIR"]
HEALTH_CSV = "outlook_health_events.csv"
EXERCISE_CSV = "outlook_exercise_events.csv"
CATEGORIES = ["Health", "Exercise"]

START_DATE = datetime(2022, 1, 1, tzinfo=pytz.utc)
CURRENT_DATE = datetime.now(pytz.utc)
END_DATE = CURRENT_DATE + timedelta(days=365)
CHUNK_SIZE = 90  # days

#--- MS Graph Credentials ---#
tenant_id = config_msgraph["tenant_id"]
user_id = config_msgraph["user_id"]
client_id = config_msgraph["client_id"]
client_secret = config_msgraph["client_secret"]

#--- Access Token ---#
def get_access_token(client_id, tenant_id, client_secret):
    url = f'https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token'
    headers = {'Content-Type': 'application/x-www-form-urlencoded'}
    data = {
        'client_id': client_id,
        'scope': 'https://graph.microsoft.com/.default',
        'client_secret': client_secret,
        'grant_type': 'client_credentials',
    }
    response = requests.post(url, headers=headers, data=data)
    response.raise_for_status()
    return response.json().get('access_token')

#--- Timezone Conversion ---#
est = pytz.timezone('US/Eastern')
def convert_to_est(date_str, time_zone):
    if '.' in date_str:
        date_str_parts = date_str.split('.')
        date_str = date_str_parts[0] + '.' + date_str_parts[1][:6]
    utc_time = datetime.strptime(date_str, "%Y-%m-%dT%H:%M:%S.%f").replace(tzinfo=pytz.utc)
    est_time = utc_time.astimezone(time_zone)
    return est_time

def format_datetime(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

#--- Event Retrieval Functions ---#
def get_calendar_events(access_token, start_date, end_date):
    start_date_str = format_datetime(start_date)
    end_date_str = format_datetime(end_date)
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Prefer": 'outlook.body-content-type="text", outlook.timezone="Eastern Standard Time"',
        "ConsistencyLevel": "eventual"
    }
    print(f"\nFetching calendar events from {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
    regular_events = get_regular_events(headers, start_date_str, end_date_str)
    recurring_instances = get_recurring_instances(headers, start_date_str, end_date_str, start_date, end_date)
    all_events = regular_events + recurring_instances
    print(f"Total events collected: {len(all_events)}")
    return all_events

def get_regular_events(headers, start_date_str, end_date_str):
    events = []
    url = (
        f"https://graph.microsoft.com/v1.0/users/{user_id}/calendarView"
        f"?startDateTime={start_date_str}&endDateTime={end_date_str}"
        f"&$select=id,subject,start,end,categories,body,seriesMasterId,type,recurrence&$top=100&$orderby=start/dateTime ASC"
    )
    print("Fetching regular events...")
    while url:
        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            events.extend(data.get('value', []))
            url = data.get('@odata.nextLink')
        except requests.HTTPError as e:
            print(f"Error fetching regular events: {e}")
            print(f"Response: {e.response.text}")
            break
    print(f"Total regular events fetched: {len(events)}")
    return events

def get_recurring_instances(headers, start_date_str, end_date_str, start_date_dt, end_date_dt):
    masters = get_recurring_masters(headers)
    print(f"Found {len(masters)} recurring series")
    all_instances = []
    for master in masters:
        master_id = master.get('id')
        recurrence = master.get('recurrence', {})
        range_start = datetime.strptime(recurrence['range']['startDate'], "%Y-%m-%d").replace(tzinfo=pytz.utc)
        range_end = recurrence['range'].get('endDate', '9999-12-31')
        if range_end != '0001-01-01':
            range_end = datetime.strptime(range_end, "%Y-%m-%d").replace(tzinfo=pytz.utc)
        else:
            range_end = datetime.max.replace(tzinfo=pytz.utc)
        if range_end < start_date_dt or range_start > end_date_dt:
            continue
        instances = get_instances_for_master(headers, master_id, start_date_str, end_date_str)
        all_instances.extend(instances)
    print(f"Total recurring instances fetched: {len(all_instances)}")
    return all_instances

def get_recurring_masters(headers):
    masters = []
    url = (
        f"https://graph.microsoft.com/v1.0/users/{user_id}/events"
        f"?$filter=type eq 'seriesMaster'"
        f"&$select=id,subject,recurrence,categories,start,end&$top=100"
    )
    print("Fetching recurring series masters...")
    while url:
        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            masters.extend(data.get('value', []))
            url = data.get('@odata.nextLink')
        except requests.HTTPError as e:
            print(f"Error fetching recurring masters: {e}")
            print(f"Response: {e.response.text}")
            break
    return masters

def get_instances_for_master(headers, master_id, start_date_str, end_date_str):
    instances = []
    url = (
        f"https://graph.microsoft.com/v1.0/users/{user_id}/events/{master_id}/instances"
        f"?startDateTime={start_date_str}&endDateTime={end_date_str}"
        f"&$select=id,subject,start,end,categories,body,seriesMasterId,type&$top=100"
    )
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()
        instances.extend(data.get('value', []))
        next_link = data.get('@odata.nextLink')
        while next_link:
            response = requests.get(next_link, headers=headers)
            response.raise_for_status()
            data = response.json()
            instances.extend(data.get('value', []))
            next_link = data.get('@odata.nextLink')
    except requests.HTTPError as e:
        print(f"Error fetching instances for master {master_id}: {e}")
        print(f"Response: {e.response.text}")
    return instances

#--- Main script ---#
def main():
    output_files = {
        "Health": os.path.join(CSV_OUTPUT_DIR, HEALTH_CSV),
        "Exercise": os.path.join(CSV_OUTPUT_DIR, EXERCISE_CSV)
    }
    try:
        access_token = get_access_token(client_id, tenant_id, client_secret)
        print("Successfully obtained access token")
        chunk_start = START_DATE
        all_event_details = []
        while chunk_start < END_DATE:
            chunk_end = min(END_DATE, chunk_start + timedelta(days=CHUNK_SIZE))
            print(f"\nProcessing chunk: {chunk_start.strftime('%Y-%m-%d')} to {chunk_end.strftime('%Y-%m-%d')}")
            events = get_calendar_events(access_token, chunk_start, chunk_end)
            all_event_details.extend(events)
            chunk_start = chunk_end + timedelta(days=1)
        print(f"\nTotal events collected across all chunks: {len(all_event_details)}")
        # Separate and write to CSVs
        for category in ["Health", "Exercise"]:
            filtered = [event for event in all_event_details if category in event.get('categories', [])]
            event_details = []
            for event in filtered:
                try:
                    start_datetime_est = convert_to_est(event['start']['dateTime'], est)
                    end_datetime_est = convert_to_est(event['end']['dateTime'], est)
                    duration_minutes = (end_datetime_est - start_datetime_est).total_seconds() / 60
                    event_details.append({
                        'subject': event['subject'],
                        'start_datetime_est': start_datetime_est.strftime("%Y-%m-%d %H:%M:%S"),
                        'end_datetime_est': end_datetime_est.strftime("%Y-%m-%d %H:%M:%S"),
                        'start_date_est': start_datetime_est.strftime("%Y-%m-%d"),
                        'end_date_est': end_datetime_est.strftime("%Y-%m-%d"),
                        'duration_minutes': duration_minutes,
                        'categories': '; '.join(event.get('categories', [])),
                        'body_text': event.get('body', {}).get('content', ''),
                        'is_recurring': 'true' if event.get('seriesMasterId') else 'false'
                    })
                except Exception as e:
                    print(f"Error processing event: {e}")
                    print(f"Problematic event: {event.get('subject', 'Unknown')}")
            if event_details:
                df = pd.DataFrame(event_details).sort_values(by='start_datetime_est', ascending=False)
                df.to_csv(output_files[category], index=False)
                print(f"Saved {len(df)} {category} events to {output_files[category]}")
            else:
                print(f"No {category} events found.")
    except Exception as e:
        print(f"An error occurred in the main process: {e}")

if __name__ == "__main__":
    main()
