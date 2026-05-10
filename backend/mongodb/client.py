import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "mandamus_virtual_hearing")

client = None
db = None

import certifi

async def connect_to_mongo():
    global client, db
    if MONGO_URI:
        ca = certifi.where()
        # tlsCAFile=ca handles the SSL handshake issues on Render/Linux
        client = AsyncIOMotorClient(
            MONGO_URI, 
            tls=True,
            tlsCAFile=ca,
            tlsAllowInvalidCertificates=True, # Kept for fallback, though ca file is preferred
            tlsAllowInvalidHostnames=True,
            serverSelectionTimeoutMS=5000
        )
        db = client[MONGO_DB_NAME]
        print(f"Connected to MongoDB with SSL/TLS (Certifi): {MONGO_DB_NAME}")
    else:
        print("MONGO_URI not found in environment variables.")

async def close_mongo_connection():
    global client
    if client:
        client.close()
        print("MongoDB connection closed.")

def get_db():
    return db
