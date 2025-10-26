# get_response.py

import base64
import json
import logging
import os
import sys
import time
from datetime import datetime, timedelta

import fitbit
import pandas as pd
import requests

from etl.response_log import write_response_log

# ---- Configuration ----
key_path = os.getenv("key_path")
sys.path.insert(0, key_path)
from config_fitbit import config_fitbit  # type: ignore  # noqa: E402

client_id = config_fitbit["CLIENT_ID"]
client_secret = config_fitbit["CLIENT_SECRET"]

# Get the absolute path of the CURRENT script's directory
script_dir = os.path.dirname(__file__)
TOKEN_FILE_PATH = os.path.join(script_dir, "auth_tokens.json")
LOG_FILE_PATH = os.path.join(script_dir, "activity_log.log")
DATA_DIR_PATH = os.path.join(script_dir, "..", "json_data")


# Logging function
def setup_logging():
    logging.basicConfig(
        filename=LOG_FILE_PATH,
        format="%(asctime)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        level=logging.INFO,
    )


# Call setup_logging to configure logging
setup_logging()


# ---- Helper Functions and Classes ----
class FitbitAuthenticator:
    def __init__(self, client_id, client_secret, token_file_path):
        self.client_id = client_id
        self.client_secret = client_secret
        self.token_file_path = token_file_path

    def load_token(self):
        try:
            with open(self.token_file_path, "r") as token_file:
                tokens = json.load(token_file)
            if (
                "expires_at" in tokens
                and datetime.now().timestamp() >= tokens["expires_at"]
            ):
                refreshed = self.refresh_token(tokens["refresh_token"])
                if refreshed:
                    return self.load_token()
                else:
                    logging.error("Token refresh failed.")
                    return None
            return tokens
        except (FileNotFoundError, json.JSONDecodeError) as e:
            logging.error(f"Error loading token: {e}")
            return None

    def refresh_token(self, refresh_token):
        refresh_url = "https://api.fitbit.com/oauth2/token"
        auth_str = f"{self.client_id}:{self.client_secret}"
        headers = {
            "Authorization": "Basic " + base64.b64encode(auth_str.encode()).decode(),
            "Content-Type": "application/x-www-form-urlencoded",
        }
        data = {"grant_type": "refresh_token", "refresh_token": refresh_token}
        response = requests.post(refresh_url, headers=headers, data=data)
        if response.status_code == 200:
            new_tokens = response.json()
            new_tokens["expires_at"] = (
                datetime.now().timestamp() + new_tokens["expires_in"]
            )
            with open(self.token_file_path, "w") as token_file:
                json.dump(new_tokens, token_file)
            return True
        else:
            logging.error("Failed to refresh token: " + response.text)
            return False

    def get_client(self):
        tokens = self.load_token()
        if tokens:
            return fitbit.Fitbit(
                self.client_id,
                self.client_secret,
                oauth2=True,
                access_token=tokens["access_token"],
                refresh_token=tokens["refresh_token"],
            )
        else:
            logging.error("Failed to initialize Fitbit client.")
            return None


### ---- Instantiate authenticator at the module level -----###
authenticator = FitbitAuthenticator(client_id, client_secret, TOKEN_FILE_PATH)


# Make request function
def make_request(
    start_date, end_date, base_url, module_str, endpoint_type, max_days=None
):
    tokens = authenticator.load_token()
    if not tokens:
        logging.error(
            "AUTHENTICATION ERROR: Token file not found or tokens are invalid. Cannot proceed with requests."
        )
        return

    current_date = datetime.now().date()

    if endpoint_type == "single_date":
        all_dates = pd.date_range(start=start_date, end=end_date)
        for curr_date in all_dates:
            curr_date_str = curr_date.strftime("%Y-%m-%d")
            url = base_url.replace("loop_date", curr_date_str)
            perform_request(url, curr_date_str, module_str, tokens)

    elif endpoint_type == "interval":
        # while loop to continuously get ranges until current date
        while start_date <= current_date:
            # Calculate the end_date based on max_days
            if max_days is not None:
                max_end_date = start_date + timedelta(
                    days=max_days - 1
                )  # -1 because start_date counts as day 1
                # Use the minimum of max_end_date and current_date to ensure we don't exceed max_days or query future dates
                end_date = min(max_end_date, current_date)
            else:
                end_date = min(
                    end_date, current_date
                )  # Ensure we don't query future dates

            # Format start_date and end_date for URL replacement
            start_date_str = start_date.strftime("%Y-%m-%d")
            end_date_str = end_date.strftime("%Y-%m-%d")

            # Construct the URL with the actual start and end dates
            url = base_url.replace("start_date", start_date_str).replace(
                "end_date", end_date_str
            )
            # date_range_str = f"{start_date_str}_to_{end_date_str}"

            # Call perform_request with the adjusted date range
            perform_request(url, end_date_str, module_str, tokens)

            # Prepare next interval
            start_date = end_date + timedelta(
                days=1
            )  # Increment start_date to day after last end_date
            if start_date > current_date:
                break  # Exit if the new start_date is beyond the current date


# Perform request function
def perform_request(url, date_str, module_str, tokens, attempt=1):
    MAX_ATTEMPTS = 3  # Define a maximum number of attempts
    filename = (
        f"{module_str.replace('get_ep_', '', 1)}_{date_str.replace('-', '_')}.json"
    )

    try:
        headers = {"Authorization": f"Bearer {tokens['access_token']}"}
        response = requests.get(url, headers=headers)

        # Process successful response
        if response.status_code == 200:
            logging.info(
                f"Request success: {filename} - Rate Limit Calls Remaining: {response.headers.get('fitbit-rate-limit-remaining')} - Rate Limit Reset Minutes: {response.headers.get('fitbit-rate-limit-reset')}"
            )
            data = response.json()

            # Construct the absolute path to the JSON file
            file_path = os.path.join(DATA_DIR_PATH, filename)

            # Use the constructed path in the open statement
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=4)

            write_response_log(module_str, date=date_str, status="success")
            print("success " + url)

        # Handle rate limiting
        elif response.status_code == 429 and attempt < MAX_ATTEMPTS:
            fitbit_reset_value = response.headers.get("fitbit-rate-limit-reset")
            # fitbit_quota_value = response.headers.get('fitbit-rate-limit-limit')
            if fitbit_reset_value is not None:
                reset_time = int(fitbit_reset_value)
                source = "api"
            else:
                reset_time = 3600  # Default value used when header is not present
                source = "code"
            logging.warning(
                f"Request rate limited:  {filename} - fitbit_reset_value from {source} is {reset_time} so waiting for reset_time + 120 {reset_time + 120} seconds before retrying. Attempt: {attempt}"
            )
            time.sleep(reset_time + 120)
            perform_request(
                url, date_str, module_str, tokens, attempt + 1
            )  # Retry the request

        # Token might be expired
        elif response.status_code == 401 and attempt == 1:
            logging.info("Access token expired, attempting to refresh tokens...")
            if authenticator.refresh_token(tokens["refresh_token"]):
                tokens = authenticator.load_token()
                if tokens:
                    # Retry the request with the refreshed tokens
                    perform_request(url, date_str, module_str, tokens, attempt + 1)
                else:
                    logging.error("Failed to load refreshed tokens.")
            else:
                logging.error("Failed to refresh tokens.")

        else:
            # Log failure for non-200 status codes
            logging.error(
                f"Request failed: {filename} Status code: {response.status_code} - Rate Limit Remaining: {response.headers.get('fitbit-rate-limit-remaining')} - Rate Limit Reset: {response.headers.get('fitbit-rate-limit-reset')}"
            )

    except json.JSONDecodeError as e:
        # Handle JSON decoding errors
        logging.error(f"Request JSON parsing error: {filename} - {e}")

    except Exception as e:
        # Handle other errors (e.g., network issues)
        logging.error(f"Request error: {filename} - {e}")
