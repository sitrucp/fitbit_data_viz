# util_update_spo2_date.py
# utility file not used in regular operations
# update MongdoDB collection date field type

from pymongo import MongoClient
from datetime import datetime

# Setup MongoDB connection
client = MongoClient('mongodb://localhost:27017')
db = client['fitbit']
collection = db['spo2_intraday_by_date']

# Fetch documents
documents = collection.find({})

for document in documents:
    # Check if 'dateTime' field exists
    if 'dateTime' in document:
        # Format 'dateTime' as date
        original_datetime = datetime.strptime(document['dateTime'], '%Y-%m-%dT%H:%M:%S')
        document['dateTime'] = original_datetime.strftime('%Y-%m-%d')
        
        # Update the document in the collection
        collection.update_one({'_id': document['_id']}, {'$set': {'dateTime': document['dateTime']}})

print("Documents updated successfully.")
