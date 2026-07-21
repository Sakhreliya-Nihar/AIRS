#crypto.py used for encrypting the incident data and ai summary within log-fowarder and decrypting it when retrieving from firestore
import os, json
from cryptography.fernet import Fernet
from dotenv import load_dotenv

# Uses a relative path so can be reused and works on any machine
ENV_PATH = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(ENV_PATH)

def get_or_create_key(): 
    key = os.getenv("ENCRYPTION_KEY")
    if not key:
        new_key = Fernet.generate_key().decode()
        with open(ENV_PATH, "a") as f:
            f.write(f"\nENCRYPTION_KEY={new_key}") # adds a new key to .env if one doesnt exist
        return new_key
    return key

# Initialize once imported
raw_key = get_or_create_key()
cipher = Fernet(raw_key.encode()) # fernet uses AES-128 in CBC mode with HMAC for auth. encode converts key to bytes 

def encrypt_payload(data_dict: dict) -> str:
    json_data = json.dumps(data_dict, default=str).encode() # converts a dict to JSON bytes, encrypts it and returns a string
    return cipher.encrypt(json_data).decode()

def decrypt_payload(encrypted_string: str):
    # If for some reason we get a list instead of a string, catch it here
    if not isinstance(encrypted_string, str):
        print(f"Error: Expected string for decryption, got {type(encrypted_string)}")
        return None
        
    try:
        decrypted_bytes = cipher.decrypt(encrypted_string.encode())
        return json.loads(decrypted_bytes.decode())
    except Exception as e:
        return None