
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Cloud,
  Download,
  Gauge,
  RefreshCw,
  Wind,
  Zap,
} from "lucide-react";

import { getAnalysis } from "./services/api";
import GenerationChart from "./components/charts/GenerationChart";
import ErrorChart from "./components/charts/ErrorChart";
import "./App.css";

function buildMetrics(analysis) {
  // Use the same matched records shown in the analysis chart; avoid presenting
  // an average based on unmatched actual or forecast intervals.
  const rows = analysis?.data ?? [];

  const averageActual = rows.length
    ? rows.reduce((sum, row) => sum + Number(row.actual_mw || 0), 0) /
      rows.length
    : null;

  const lastRow = rows.length ? rows[rows.length - 1] : null;

  return [
    {
      label: "Actual wind generation",
      value:
        averageActual !== null
          ? Math.round(averageActual).toLocaleString("en-GB")
          : "—",
      unit: "MW",
      note: "Average across matched intervals",
      icon: Wind,
      color: "green",
    },
    {
      label: "Latest eligible forecast",
      value:
        lastRow?.forecast_mw != null
          ? Math.round(lastRow.forecast_mw).toLocaleString("en-GB")
          : "—",
      unit: "MW",
      note: "Last matched delivery interval",
      icon: Activity,
      color: "blue",
    },
    {
      label: "Mean absolute error",
      value:
        analysis?.mae_mw != null
          ? Math.round(analysis.mae_mw).toLocaleString("en-GB")
          : "—",
      unit: "MW",
      note: "Mean absolute forecast error",
      icon: Gauge,
      color: "orange",
    },
    {
      label: "Forecast bias",
      value:
        analysis?.bias_mw != null
          ? Math.round(analysis.bias_mw).toLocaleString("en-GB")
          : "—",
      unit: "MW",
      note: "Forecast minus actual",
      icon: Zap,
      color: "purple",
    },
  ];
}

function App() {
  // Keep API results and request state separate so loading/errors can render
  // alongside the dashboard without replacing its layout.
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Prevent a late network response from updating state after unmount.
    let cancelled = false;

    async function loadAnalysis() {
      try {
        setLoading(true);
        setError("");

        // The current pilot dashboard uses a fixed two-day analysis window.
        const result = await getAnalysis(
          "2026-01-01",
          "2026-01-02"
        );

        if (!cancelled) {
          setAnalysis(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load analysis.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAnalysis();

    return () => {
      cancelled = true;
    };
  }, []);

  const metrics = buildMetrics(analysis);

  function exportCSV() {
    const rows = analysis?.data ?? [];

    if (!rows.length) {
      return;
    }

    const columns = [
      "hour",
      "actual_mw",
      "forecast_mw",
      "publishTime",
      "error_mw",
      "absolute_error_mw",
    ];

    // Quote every cell and escape embedded quotes so commas/newlines in
    // values do not break the CSV structure.
    const csv = [
      columns.join(","),
      ...rows.map((row) =>
        columns
          .map((column) => {
            const value = row[column] ?? "";
            return `"${String(value).replaceAll('"', '""')}"`;
          })
          .join(",")
      ),
    ].join("\n");

    // Create a temporary browser download from the currently displayed rows.
    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "wind-analysis-january-2026.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="app-shell">
      {/* Sidebar links navigate to sections of this single-page dashboard. */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Wind size={23} />
          </div>

          <div>
            <h2>WATTWISE</h2>
            <span>ENERGY INTELLIGENCE</span>
          </div>
        </div>

        <div className="sidebar-section">WORKSPACE</div>

        <nav className="sidebar-nav">
          <a className="nav-item active" href="#overview">
            <Activity size={18} />
            Overview
          </a>

          <a className="nav-item" href="#forecasts">
            <Wind size={18} />
            Wind forecasts
          </a>

          <a className="nav-item" href="#accuracy">
            <Gauge size={18} />
            Forecast accuracy
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="status-dot" />

          <div>
            <strong>Data workspace</strong>
            <span>January 2026 pilot</span>
          </div>
        </div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar">
          <div className="breadcrumb">
            Energy markets <span>/</span> Wind intelligence
          </div>

          <div className="topbar-right">
            <span className="live-indicator">
              <span /> ELEXON DATA
            </span>

            <button
              className="icon-button"
              aria-label="Refresh data"
              onClick={() => window.location.reload()}
            >
              <RefreshCw size={17} />
            </button>
          </div>
        </header>

        <section className="page-heading">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" />
              DAY-AHEAD PROCUREMENT INTELLIGENCE
            </div>

            <h1>
              Wind power <span>insights.</span>
            </h1>

            <p>
              Understand renewable generation, evaluate forecast uncertainty,
              and make more informed purchasing decisions.
            </p>
          </div>

          <div className="date-selector" aria-label="Analysis period">
            <CalendarDays size={17} />
            <span>
              <small>ANALYSIS PERIOD</small>
              <strong>1–2 January 2026</strong>
            </span>
          </div>
        </section>

        <section className="context-banner">
          <div className="context-icon">
            <Cloud size={21} />
          </div>

          <div className="context-copy">
            <strong>National wind generation monitor</strong>
            <span>
              Historical pilot · UK · 30-minute actuals · Forecast publication
              timestamps retained
            </span>
          </div>

          <span className="context-tag">PILOT VIEW</span>
        </section>

        <section className="section-heading">
          <div>
            <span className="section-kicker">
              01 / GENERATION SNAPSHOT
            </span>
            <h2>Market overview</h2>
          </div>

          <span className="muted-label">
            <span className="unit-dot" /> Actuals &amp; forecasts in MW
          </span>
        </section>

        {loading && (
          <p role="status" className="muted-label">
            Loading January 2026 wind analysis…
          </p>
        )}

        {error && (
          <p role="alert" className="error-message">
            {error}. Check the backend and API connection.
          </p>
        )}

        {/* Summary values are derived from the API analysis response. */}
        <section className="metrics-grid">
          {metrics.map((metric) => {
            const Icon = metric.icon;

            return (
              <article className="metric-card" key={metric.label}>
                <div className="metric-top">
                  <span>{metric.label}</span>

                  <div className={`metric-icon ${metric.color}`}>
                    <Icon size={19} />
                  </div>
                </div>

                <div className="metric-value">
                  {metric.value}
                  <small>{metric.unit}</small>
                </div>

                <div className="metric-note">{metric.note}</div>
              </article>
            );
          })}
        </section>

        <section className="section-heading chart-section-heading">
          <div>
            <span className="section-kicker">02 / TIME SERIES</span>
            <h2>Generation performance</h2>
          </div>

          <button
            className="secondary-button"
            onClick={exportCSV}
            disabled={!analysis?.data?.length}
          >
            <Download size={16} />
            Export analysis
          </button>
        </section>

        {/* Charts receive only matched actual/forecast analysis rows. */}
        <section className="chart-card" id="forecasts">
          <div className="chart-card-heading">
            <div>
              <h3>Wind generation vs forecast</h3>
              <p>
                Compare observed generation with the eligible forecast.
              </p>
            </div>

            <div className="chart-legend">
              <span>
                <i className="legend-actual" /> Actual
              </span>
              <span>
                <i className="legend-forecast" /> Forecast
              </span>
            </div>
          </div>

          {analysis?.data?.length ? (
            <GenerationChart data={analysis.data} />
          ) : (
            <div className="chart-placeholder">
              <div className="placeholder-icon">
                <Activity size={25} />
              </div>

              <strong>Generation timeline</strong>

              <span>
                {loading
                  ? "Loading generation data…"
                  : "No matched generation data is available for this period."}
              </span>
            </div>
          )}
        </section>

        <section
          className="section-heading chart-section-heading"
          id="accuracy"
        >
          <div>
            <span className="section-kicker">03 / FORECAST QUALITY</span>
            <h2>Forecast accuracy</h2>
          </div>

          <span className="muted-label">
            {analysis?.count ?? 0} matched intervals
          </span>
        </section>

        <section className="accuracy-grid">
          <article className="chart-card accuracy-card">
            <div className="accuracy-heading">
              <div>
                <h3>Error distribution</h3>
                <p>Forecast minus actual generation</p>
              </div>

              <ArrowUpRight size={19} />
            </div>

            {analysis?.data?.length ? (
              <ErrorChart data={analysis.data} />
            ) : (
              <div className="chart-placeholder compact">
                <Gauge size={25} />
                <span>
                  {loading
                    ? "Loading forecast errors…"
                    : "No forecast error data available."}
                </span>
              </div>
            )}

            <div className="accuracy-stats">
              <span>
                MAE:{" "}
                {analysis?.mae_mw != null
                  ? `${Number(analysis.mae_mw).toLocaleString("en-GB", {
                      maximumFractionDigits: 2,
                    })} MW`
                  : "—"}
              </span>

              <span>
                RMSE:{" "}
                {analysis?.rmse_mw != null
                  ? `${Number(analysis.rmse_mw).toLocaleString("en-GB", {
                      maximumFractionDigits: 2,
                    })} MW`
                  : "—"}
              </span>
            </div>
          </article>

          <article className="chart-card accuracy-card">
            <div className="accuracy-heading">
              <div>
                <h3>Procurement context</h3>
                <p>Wind generation is not total electricity demand.</p>
              </div>

              <ArrowDownRight size={19} />
            </div>

            <div className="procurement-note">
              <strong>Decision support, not a demand forecast</strong>

              <p>
                This pilot measures wind forecast uncertainty. Total residual
                demand cannot be calculated without consumer demand and other
                generation data.
              </p>

              <p>
                Forecast selection must respect the decision cutoff and use
                only forecasts published before that cutoff for each delivery
                interval.
              </p>
            </div>
          </article>
        </section>

        <footer className="app-footer">
          <span>WATTWISE / UK WIND INTELLIGENCE</span>
          <span>Historical pilot · January 2026</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
