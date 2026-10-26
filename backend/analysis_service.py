
import pandas as pd


def analyze_forecast_accuracy(
    actual_records: list[dict],
    forecast_records: list[dict],
    decision_hour_utc: int = 11,
) -> dict:
    """
    Evaluate day-ahead wind forecasts against actual generation.

    Actual data: half-hourly FUELHH records, averaged to hourly MW.
    Forecast data: WINDFOR records with publication timestamps.

    For each delivery hour, select the latest forecast published
    no later than the configured cutoff on the preceding UTC day.

    Error convention: forecast minus actual.
    Positive bias means overforecasting; negative bias means
    underforecasting.

    Confirm the applicable market decision deadline before
    using this assumption in production.
    """

    # Keep one consistent response shape for cases where no comparison can
    # be scored; the metric values are null because no samples exist.
    empty_result = {
        "count": 0,
        "mae_mw": None,
        "rmse_mw": None,
        "bias_mw": None,
        "decision_cutoff_utc": f"{decision_hour_utc:02d}:00",
        "data": [],
    }

    if not actual_records or not forecast_records:
        return {
            **empty_result,
            "message": "Actual or forecast data is unavailable.",
        }

    if not 0 <= decision_hour_utc <= 23:
        raise ValueError("decision_hour_utc must be between 0 and 23.")

    actual_df = pd.DataFrame(actual_records)
    forecast_df = pd.DataFrame(forecast_records)

    # Fail explicitly if an upstream response does not have the fields the
    # matching and scoring steps require.
    required_actual = {"startTime", "generation"}
    required_forecast = {"startTime", "publishTime", "generation"}

    if not required_actual.issubset(actual_df.columns):
        raise ValueError("Actual data is missing required fields.")

    if not required_forecast.issubset(forecast_df.columns):
        raise ValueError("Forecast data is missing required fields.")

    # Parse timestamps and generation values.
    for column in ["startTime"]:
        actual_df[column] = pd.to_datetime(
            actual_df[column], utc=True, errors="coerce"
        )

    actual_df["generation"] = pd.to_numeric(
        actual_df["generation"], errors="coerce"
    )

    forecast_df["startTime"] = pd.to_datetime(
        forecast_df["startTime"], utc=True, errors="coerce"
    )
    forecast_df["publishTime"] = pd.to_datetime(
        forecast_df["publishTime"], utc=True, errors="coerce"
    )
    forecast_df["generation"] = pd.to_numeric(
        forecast_df["generation"], errors="coerce"
    )

    actual_df = actual_df.dropna(
        subset=["startTime", "generation"]
    )
    forecast_df = forecast_df.dropna(
        subset=["startTime", "publishTime", "generation"]
    )

    # Average two half-hourly actual readings into hourly MW.
    actual_df["hour"] = actual_df["startTime"].dt.floor("h")

    hourly_actuals = (
        actual_df.groupby("hour", as_index=False)["generation"]
        .mean()
        .rename(columns={"generation": "actual_mw"})
    )

    if hourly_actuals.empty:
        return {
            **empty_result,
            "message": "No valid actual generation records were found.",
        }

    # WINDFOR startTime is expected to use hourly target timestamps.
    # Normalize to the delivery hour to match hourly actuals.
    forecast_df["hour"] = forecast_df["startTime"].dt.floor("h")

    target_hours = set(hourly_actuals["hour"])
    forecast_df = forecast_df[
        forecast_df["hour"].isin(target_hours)
    ].copy()

    if forecast_df.empty:
        return {
            **empty_result,
            "message": "No forecasts match the actual delivery hours.",
        }

    # Cutoff is on the UTC day before the delivery hour.
    forecast_df["cutoff"] = (
        forecast_df["hour"].dt.normalize()
        - pd.Timedelta(days=1)
        + pd.Timedelta(hours=decision_hour_utc)
    )

    # Exclude forecasts published after the decision cutoff.
    eligible = forecast_df[
        forecast_df["publishTime"] <= forecast_df["cutoff"]
    ].copy()

    if eligible.empty:
        return {
            **empty_result,
            "message": (
                "No forecasts were published before the configured "
                "day-ahead decision cutoff."
            ),
        }

    # Select the most recently published eligible forecast per hour.
    eligible = eligible.sort_values(
        ["hour", "publishTime"]
    )

    latest = eligible.drop_duplicates(
        subset=["hour"],
        keep="last",
    ).copy()

    # Verify selected forecasts respect their individual cutoffs.
    if (latest["publishTime"] > latest["cutoff"]).any():
        raise ValueError(
            "Invalid forecast selection: a forecast was published "
            "after the decision cutoff."
        )

    latest = latest.rename(
        columns={"generation": "forecast_mw"}
    )

    # Score only hours with both actuals and eligible forecasts.
    comparison = hourly_actuals.merge(
        latest[["hour", "forecast_mw", "publishTime"]],
        on="hour",
        how="inner",
        validate="one_to_one",
    ).sort_values("hour")

    if comparison.empty:
        return {
            **empty_result,
            "message": "No overlapping actuals and eligible forecasts.",
        }

    # Error convention: forecast minus actual.
    comparison["error_mw"] = (
        comparison["forecast_mw"] - comparison["actual_mw"]
    )
    comparison["absolute_error_mw"] = comparison["error_mw"].abs()

    # MAE summarizes typical absolute error; RMSE penalizes large misses more.
    mae = comparison["absolute_error_mw"].mean()
    rmse = (comparison["error_mw"].pow(2).mean()) ** 0.5
    # The signed mean preserves direction: positive is overforecasting.
    bias = comparison["error_mw"].mean()

    # Prepare JSON-safe timestamps.
    comparison["hour"] = comparison["hour"].map(
        lambda value: value.isoformat()
    )
    comparison["publishTime"] = comparison["publishTime"].map(
        lambda value: value.isoformat()
    )

    return {
        "count": len(comparison),
        "mae_mw": round(float(mae), 2),
        "rmse_mw": round(float(rmse), 2),
        "bias_mw": round(float(bias), 2),
        "decision_cutoff_utc": f"{decision_hour_utc:02d}:00",
        "data": comparison.to_dict(orient="records"),
    }
