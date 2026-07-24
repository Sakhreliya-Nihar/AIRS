from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader
import os

# Define the name of the header the frontend must send
API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

# Get the secret key from environment variables 
EXPECTED_API_KEY = os.getenv("API_KEY") 

async def get_api_key(api_key_header: str = Security(api_key_header)):
    print(f"Received Key: {api_key_header}") 
    print(f"Expected Key: {EXPECTED_API_KEY}")
    if api_key_header == EXPECTED_API_KEY:
        return api_key_header
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials"
        )