
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

function GenerationChart({ data = [] }) {
  // Keep the API row fields intact and add a human-readable UTC axis label.
  const chartData = data.map((row) => ({
    ...row,
    time: new Date(row.hour).toLocaleString("en-GB", {
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    }),
  }));

  return (
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 15, right: 15, left: 5, bottom: 10 }}
        >
          <CartesianGrid stroke="#243247" strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            tick={{ fill: "#8d9bb0", fontSize: 10 }}
            minTickGap={35}
          />
          {/* Scale tick labels to thousands while tooltips retain full MW. */}
          <YAxis
            tick={{ fill: "#8d9bb0", fontSize: 11 }}
            tickFormatter={(value) => `${Math.round(value / 1000)}k`}
            width={45}
          />
          <Tooltip
            contentStyle={{
              background: "#111a29",
              border: "1px solid #2a3649",
              borderRadius: 8,
              color: "#e8edf5",
              fontSize: 12,
            }}
            labelStyle={{ color: "#9eacc0" }}
            formatter={(value, name) => [
              `${Number(value).toLocaleString("en-GB")} MW`,
              name,
            ]}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="actual_mw"
            name="Actual generation"
            stroke="#6ee7a7"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="forecast_mw"
            name="Eligible forecast"
            stroke="#78aaff"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default GenerationChart;
