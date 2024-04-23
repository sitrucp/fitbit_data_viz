from pymongo import MongoClient, UpdateOne

# Setup MongoDB connection
client = MongoClient('mongodb://localhost:27017')
db = client['fitbit']
collection = db['sleeplog_by_date']

# Fetch documents where 'dateOfSleep' needs to be renamed
cursor = collection.find({"dateOfSleep": {"$exists": True}})

# Prepare bulk update operations
bulk_updates = []
for document in cursor:
    # Use the UpdateOne operation for proper bulk_write usage
    update_op = UpdateOne(
        {'_id': document['_id']},
        {'$rename': {'dateOfSleep': 'date'}}
    )
    bulk_updates.append(update_op)

# Execute bulk operations if there are any
if bulk_updates:
    result = collection.bulk_write(bulk_updates)
    print(f"Documents updated successfully: {result.bulk_api_result}")
else:
    print("No documents need updating.")
