import requests
import json

url = "https://leetcode.com/graphql"
username = "lKfZaDp6DQ"

query = """
query getRecentAcSubmissions($username: String!, $limit: Int!) {
  recentAcSubmissionList(username: $username, limit: $limit) {
    title
    titleSlug
    timestamp
  }
}
"""

headers = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

payload = {
    "query": query,
    "variables": {"username": username, "limit": 100}
}

try:
    response = requests.post(url, json=payload, headers=headers, timeout=10)
    if response.status_code == 200:
        data = response.json()
        print(json.dumps(data, indent=2))
    else:
        print(f"Error: Status code {response.status_code}")
        print(response.text)
except Exception as e:
    print(f"Request failed: {e}")
