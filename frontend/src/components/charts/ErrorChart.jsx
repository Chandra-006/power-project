
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

function ErrorChart({ data = [] }) {
  // Format each matched delivery hour in UTC for the chart's x-axis.
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
    <div style={{ width: "100%", height: 230 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
        >
          <CartesianGrid stroke="#243247" strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            tick={{ fill: "#8d9bb0", fontSize: 9 }}
            minTickGap={35}
          />
          <YAxis
            tick={{ fill: "#8d9bb0", fontSize: 10 }}
            width={48}
          />
          <Tooltip
            contentStyle={{
              background: "#111a29",
              border: "1px solid #2a3649",
              borderRadius: 8,
              color: "#e8edf5",
              fontSize: 11,
            }}
            formatter={(value) => [
              `${Number(value).toLocaleString("en-GB")} MW`,
              "Forecast error",
            ]}
          />
          {/* Zero separates overforecast errors from underforecast errors. */}
          <ReferenceLine y={0} stroke="#8290a5" />
          <Bar
            dataKey="error_mw"
            name="Forecast error"
            fill="#78aaff"
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ErrorChart;
