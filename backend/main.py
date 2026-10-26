
from datetime import date, timedelta

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from elexon_service import fetch_wind_actuals
from forecast_service import fetch_wind_forecasts
from analysis_service import analyze_forecast_accuracy

# FastAPI uses this metadata for generated OpenAPI/Swagger documentation.
app = FastAPI(
    title="UK Wind Power Analytics API",
    description="Wind generation forecasts and accuracy analysis",
    version="1.0.0",
)

# Permit the local Vite and Docker frontend origins to call this API from a
# browser. Add the deployed frontend origin here when configuring cloud hosting.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000",
                    "http://127.0.0.1:3000",
                    "http://localhost:5173",
                    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    # A simple landing response for callers checking that the API is running.
    return {"message": "UK Wind Power Analytics API is running"}


@app.get("/api/health")
def health():
    # Lightweight endpoint for local checks and container health monitoring.
    return {"status": "ok"}


def validate_january_dates(start_date: date, end_date: date):
    # The current dataset/API implementation is intentionally limited to
    # delivery dates in January 2026.
    if start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date must be before or equal to end_date",
        )

    if start_date < date(2026, 1, 1) or end_date > date(2026, 1, 31):
        raise HTTPException(
            status_code=400,
            detail="Dates must be within January 2026",
        )


@app.get("/api/actuals")
async def get_actuals(
    start_date: date = Query(default=date(2026, 1, 1)),
    end_date: date = Query(default=date(2026, 1, 2)),
):
    validate_january_dates(start_date, end_date)

    try:
        # Return both a record count and the raw Elexon records for the UI.
        records = await fetch_wind_actuals(start_date, end_date)
        return {"count": len(records), "data": records}
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch Elexon actual generation: {exc}",
        ) from exc


@app.get("/api/forecasts")
async def get_forecasts(
    start_date: date = Query(default=date(2026, 1, 1)),
    end_date: date = Query(default=date(2026, 1, 3)),
):
    validate_january_dates(start_date, end_date)

    try:
        # The forecast service filters the API response to January 2026
        # delivery intervals while retaining each record's publication time.
        records = await fetch_wind_forecasts(start_date, end_date)
        return {"count": len(records), "data": records}
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch Elexon wind forecasts: {exc}",
        ) from exc


@app.get("/api/analysis")
async def get_analysis(
    start_date: date = Query(default=date(2026, 1, 1)),
    end_date: date = Query(default=date(2026, 1, 2)),
    decision_hour_utc: int = Query(default=11, ge=0, le=23),
):
    validate_january_dates(start_date, end_date)

    try:
        # Actuals cover the requested delivery period. Earlier forecast
        # publication dates are also requested so day-ahead candidates exist.
        actuals = await fetch_wind_actuals(start_date, end_date)

        # Include forecast publication dates before the delivery period.
        forecast_start = max(date(2025, 12, 1), start_date - timedelta(days=2))
        forecasts = await fetch_wind_forecasts(
            forecast_start, end_date
        )

        result = analyze_forecast_accuracy(
            actual_records=actuals,
            forecast_records=forecasts,
            decision_hour_utc=decision_hour_utc,
        )

        # Include request dates alongside the analysis metrics and matched rows.
        return {
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
            },
            **result,
        }

    except HTTPException:
        # Preserve intentional HTTP errors instead of wrapping them as 502s.
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Forecast analysis failed: {exc}",
        ) from exc
