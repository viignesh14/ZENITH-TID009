import os
from dotenv import load_dotenv
from google import genai

load_dotenv()
os.environ.pop("GOOGLE_API_KEY", None)
api_key = os.getenv("GEMINI_API_KEY")
print(f"Testing with Key starting with: {api_key[:10] if api_key else 'None'}")

client = genai.Client(api_key=api_key)
try:
    response = client.models.generate_content(model="gemini-1.5-flash", contents="hello")
    print("SUCCESS")
    print(response.text)
except Exception as e:
    print(f"FAILURE: {e}")
