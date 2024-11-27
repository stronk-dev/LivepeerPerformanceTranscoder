import React from "react";
import PropTypes from "prop-types";
import "./Histogram.css";

const Histogram = ({ aggregateData, selectedKPI }) => {
  if (!aggregateData || !selectedKPI) {
    return <div className="histogram">No data available.</div>;
  }

  const buckets = aggregateData.buckets[selectedKPI] || [];
  const maxCount = Math.max(...buckets.map((bucket) => bucket.count), 1);

  const { median, percentiles, range } = aggregateData[selectedKPI] || {
    median: null,
    percentiles: {},
    range: [],
  };

  const kpiLabels = {
    pricing: "Pricing",
    discoveryTime: "Discovery Time",
    performanceRTR: "Realtime Ratio",
    performanceSR: "Success Rate",
  };

  return (
    <div className="histogram">
      {/* Histogram Chart */}
      <h4>Histogram</h4>
      <div className="histogram-chart">
        {buckets.map((bucket, index) => (
          <div key={index} className="histogram-bar">
            <div
              className="bar"
              style={{
                height: `${(bucket.count / maxCount) * 100}%`,
              }}
            >
              <div className="tooltip">
                <span>Observations: {bucket.count}</span>
                <span>Min: {bucket.range[0].toFixed(2)}</span>
                <span>Max: {bucket.range[1].toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* X-axis labels for histogram buckets */}
      <div className="histogram-x-axis">
        <span className="x-axis-label"></span>
        {buckets.map((bucket, index) => (
          <span key={index} className="x-axis-label">
            {index + 1 < buckets.length && bucket.range[1].toPrecision(3)}
          </span>
        ))}
      </div>

      {/* Median, Percentiles, and Range Visualization */}
      <h4>Box plot</h4>
      <div className="summary-visualization">
        <div className="summary-bar">
          {/* Background for the interquartile range (between 25th and 75th percentiles) */}
          <div
            className="iqr-background"
            style={{
              left: `${((percentiles.p25 - range[0]) / (range[1] - range[0])) * 100}%`,
              width: `${((percentiles.p75 - percentiles.p25) / (range[1] - range[0])) * 100}%`,
            }}
          ></div>
          <div className="range"></div>
          <div
            className="hoverable-line"
            style={{
              left: `${((median - range[0]) / (range[1] - range[0])) * 100}%`,
            }}
          >
            <div className="median"></div>
            <span className="tooltip">Median: {median?.toFixed(2)}</span>
          </div>
          <div
            className="hoverable-line"
            style={{
              left: `${((percentiles.p25 - range[0]) / (range[1] - range[0])) * 100}%`,
            }}
          >
            <div className="percentile p25"></div>
            <span className="tooltip">25th Percentile: {percentiles.p25?.toFixed(2)}</span>
          </div>
          <div
            className="hoverable-line"
            style={{
              left: `${((percentiles.p75 - range[0]) / (range[1] - range[0])) * 100}%`,
            }}
          >
            <div className="percentile p75"></div>
            <span className="tooltip">75th Percentile: {percentiles.p75?.toFixed(2)}</span>
          </div>
        </div>
        <div className="summary-labels">
          <span>{range[0]?.toFixed(2)}</span>
          <span
            className="median-label"
            style={{
              left: `${((median - range[0]) / (range[1] - range[0])) * 100}%`,
            }}
          >
            {median?.toFixed(2)}
          </span>
          <span>{range[1]?.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

Histogram.propTypes = {
  aggregateData: PropTypes.shape({
    buckets: PropTypes.objectOf(
      PropTypes.arrayOf(
        PropTypes.shape({
          range: PropTypes.arrayOf(PropTypes.number).isRequired,
          count: PropTypes.number.isRequired,
        })
      )
    ).isRequired,
  }).isRequired,
  selectedKPI: PropTypes.oneOf(["pricing", "discoveryTime", "performanceRTR", "performanceSR"]).isRequired,
};

export default Histogram;
