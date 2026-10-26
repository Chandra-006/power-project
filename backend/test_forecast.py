
import asyncio
from datetime import date

from forecast_service import fetch_wind_forecasts


async def main():
    # Manually inspect forecast versions returned for a short sample period.
    records = await fetch_wind_forecasts(
        date(2026, 1, 1),
        date(2026, 1, 3),
    )

    print("Forecast records:", len(records))

    # Print only a few key fields to keep the diagnostic output readable.
    for record in records[:5]:
        print({
            "publishTime": record.get("publishTime"),
            "startTime": record.get("startTime"),
            "generation": record.get("generation"),
        })


if __name__ == "__main__":
    # Start the async fetch when this script is run directly.
    asyncio.run(main())
