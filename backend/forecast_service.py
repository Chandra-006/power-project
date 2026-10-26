
from datetime import date, datetime, time, timedelta, timezone

import httpx

# Shared Elexon BMRS datasets endpoint; WINDFOR contains wind forecasts.
BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1/datasets"


async def fetch_wind_forecasts(
    start_date: date,
    end_date: date,
) -> list[dict]:
    """Fetch WINDFOR forecast versions published in the date range."""

    url = f"{BASE_URL}/WINDFOR/stream"

    # Use a half-open UTC range to include the complete end date.
    publish_from = datetime.combine(
        start_date, time.min, tzinfo=timezone.utc
    )
    publish_to = datetime.combine(
        end_date + timedelta(days=1),
        time.min,
        tzinfo=timezone.utc,
    )

    params = {
        "publishDateTimeFrom": publish_from.isoformat(),
        "publishDateTimeTo": publish_to.isoformat(),
    }

    # Preserve publication timestamps so analysis can determine which version
    # was available before each delivery-hour decision cutoff.
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        records = response.json()

    # Keep forecasts whose target delivery interval is in January 2026.
    # Preserve publishTime so later analysis can select the correct version.
    return [
        record
        for record in records
        if record.get("startTime")
        and record.get("publishTime")
        and record.get("generation") is not None
        and date.fromisoformat(record["startTime"][:10]).year == 2026
        and date.fromisoformat(record["startTime"][:10]).month == 1
    ]
