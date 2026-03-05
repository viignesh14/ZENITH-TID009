import requests


def extract_username_from_url(url):
    if not url:
        return None
    return url.rstrip("/").split("/")[-1]


def get_github_profile(username):
    url = f"https://api.github.com/users/{username}"
    response = requests.get(url)

    if response.status_code != 200:
        return None

    return response.json()