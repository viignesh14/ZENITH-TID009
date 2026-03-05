import os
from google import genai

key = "AIzaSyBLA9vB5zdSuUsUz1wv-55HlmiDUjbDLyI"
os.environ["GEMINI_API_KEY"] = key
os.environ.pop("GOOGLE_API_KEY", None)
client = genai.Client()
try:
    response = client.models.generate_content(model="gemini-2.5-flash", contents="hello")
    print("SUCCESS")
    print(response.text)
except Exception as e:
    print(f"FAILURE: {e}")
