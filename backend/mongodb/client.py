import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "mandamus_virtual_hearing")

client = None
db = None

async def connect_to_mongo():
    global client, db
    if MONGO_URI:
        # tlsAllowInvalidCertificates=True handles the common Mac SSL certificate issue
        client = AsyncIOMotorClient(
            MONGO_URI, 
            tls=True,
            tlsAllowInvalidCertificates=True,
            tlsAllowInvalidHostnames=True,
            serverSelectionTimeoutMS=5000
        )
        db = client[MONGO_DB_NAME]
        print(f"Connected to MongoDB: {MONGO_DB_NAME}")
    else:
        print("MONGO_URI not found in environment variables.")

async def close_mongo_connection():
    global client
    if client:
        client.close()
        print("MongoDB connection closed.")

def get_db():
    return db
