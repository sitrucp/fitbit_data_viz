# util_update_hr_date.py
# utility file not used in regular operations
# update MongdoDB collection date field type

from pymongo import MongoClient
from datetime import datetime

# Setup MongoDB connection
client = MongoClient('mongodb://localhost:27017')
db = client['fitbit']
collection = db['hr_intraday_by_date']

# Fetch documents
documents = collection.find({})

for document in documents:
    # Check if 'measurements' field exists
    if 'measurements' in document:
        updated_measurements = []
        # Iterate through each entry in the 'measurements' array
        for entry in document['measurements']:
            # Format 'dateTime' from Date to string
            if 'dateTime' in entry:
                # Ensure 'dateTime' is a datetime object before formatting
                if isinstance(entry['dateTime'], datetime):
                    formatted_datetime = entry['dateTime'].strftime('%Y-%m-%dT%H:%M:%S.%LZ')
                    entry['dateTime'] = formatted_datetime
                updated_measurements.append(entry)
        
        # Update the document in the collection with the modified 'measurements'
        collection.update_one(
            {'_id': document['_id']},
            {'$set': {'measurements': updated_measurements}}
        )

print("Documents updated successfully.")
