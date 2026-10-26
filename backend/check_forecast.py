
import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

# This small diagnostic script checks the local API without requiring
# an additional HTTP client dependency.
BASE_URL = "http://127.0.0.1:8000/api/forecasts"

# Ask the API for forecast records published within this date range.
params = {
    "start_date": "2026-01-01",
    "end_date": "2026-01-03",
}

# Encode the query parameters so the URL is safe to send as an HTTP request.
request_url = f"{BASE_URL}?{urlencode(params)}"
request = Request(request_url, headers={"Accept": "application/json"})

try:
    # Read the API response and parse its JSON body into Python data.
    with urlopen(request, timeout=60) as response:
        result = json.loads(response.read().decode("utf-8"))

    # The forecasts endpoint wraps records in a "data" field.
    records = result.get("data", [])
    target_hour = "2026-01-01T00:00:00"

    # Keep forecasts whose delivery start time begins with the target hour;
    # multiple results can exist because forecasts may be republished.
    matches = [
        record
        for record in records
        if record.get("startTime", "").startswith(target_hour)
    ]

    print(f"Forecast records retrieved: {len(records)}")
    print(f"Matching forecasts for {target_hour}: {len(matches)}")

    # Sort by publication time to make the forecast versions easy to compare.
    for record in sorted(
        matches,
        key=lambda item: item.get("publishTime", ""),
    ):
        print(json.dumps(record, indent=2))

    # Give a useful hint when the chosen date range returns no target records.
    if not matches:
        print(
            "No matching forecast found. Check the API date range "
            "and whether the endpoint includes this delivery hour."
        )

# Distinguish an HTTP response error from a failure to connect to the API.
except HTTPError as exc:
    print(f"HTTP error: {exc.code}")
    print(exc.read().decode("utf-8", errors="replace"))

except URLError as exc:
    print(f"Connection error: {exc.reason}")
