import requests

URL = "https://api.bgpview.io/search?query_term=US"

try:
    print(f"Testing API: {URL}")
    resp = requests.get(URL, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
    print(f"Status Code: {resp.status_code}")
    print(f"Response (first 300 chars):\n{resp.text[:300]}")
except Exception as e:
    print(f"API test failed: {e}")
