
from datetime import date

import httpx

# Elexon BMRS dataset API base; FUELHH contains half-hourly actuals.
BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1/datasets"


async def fetch_wind_actuals(
    start_date: date,
    end_date: date,
) -> list[dict]:
    """Fetch actual national wind generation by settlement date."""

    url = f"{BASE_URL}/FUELHH/stream"

    # The API uses settlement-date bounds and a fuel-type filter for wind.
    params = {
        "settlementDateFrom": start_date.isoformat(),
        "settlementDateTo": end_date.isoformat(),
        "fuelType": "WIND",
    }

    # Use an async client because the FastAPI route is asynchronous; raising
    # on non-success status codes lets the route return a clear API error.
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        records = response.json()

    # Keep the result focused on wind even though the request already filters.
    return [
        record
        for record in records
        if record.get("fuelType") == "WIND"
    ]
