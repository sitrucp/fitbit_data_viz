import sys
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import datetime as dt
from pymongo import MongoClient
import matplotlib.pyplot as plt
import matplotlib.dates as mdates


# Specify the start and end dates for the query
days_range = 1000

# If a valid command-line argument is provided
if len(sys.argv) > 1:
    try:
        # Get value
        days_range = int(sys.argv[1])
    except ValueError:
        # Print an error message but keep the default days_range
        print("Provided value for days_range is not an integer. Using default value.")

start_date = (datetime.now() - timedelta(days=days_range)).strftime('%Y-%m-%d') #"2024-04-03"
end_date = end_date = datetime.now().strftime('%Y-%m-%d') # "2024-04-04"

# MongoDB connection setup
client = MongoClient('mongodb://localhost:27017')
db = client['fitbit']
collection = db['hrv_intraday_by_date']

# Define the aggregation pipeline with dynamic parameters
pipeline = [
    {
        "$match": {
            "date": {
                "$gte": start_date, 
                "$lte": end_date
            }
        }
    },
    {
        "$unwind": "$measurements"
    },
    {
        "$project": {
            "datetime": "$measurements.datetime",
            "rmssd": "$measurements.rmssd",
            "_id": 0  # Exclude the MongoDB default _id field
        }
    }
]

# Execute the aggregation pipeline
query_result = list(collection.aggregate(pipeline))

# Convert the query results directly into a DataFrame
df = pd.DataFrame(query_result)

# Exclude outliers (adjust threshold as needed)
df_filtered = df[df['rmssd'] <= 100].copy()

# Define bins - this is where you experiment with different bins
bins = np.percentile(df_filtered['rmssd'], [0, 25, 50, 75, 100])
df_filtered['bin'] = pd.cut(df_filtered['rmssd'], bins=bins, include_lowest=True)

# Pivot data for stacking
pivot_df = df_filtered.pivot_table(index='datetime', columns='bin', values='rmssd', aggfunc='count').fillna(0)

# Sum columns over all dates
column_sums = pivot_df.sum(axis=0)


# Optionally convert to DataFrame for presentation or further processing
column_sums_df = column_sums.reset_index().rename(columns={0: 'Total Count'})
column_sums_df.columns = ['Bin', 'Total Count']
print(column_sums_df)
