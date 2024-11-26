import React from "react";
import PropTypes from "prop-types";
import "./RankingTable.css";

const RankingTable = ({ orchestrators, selectedKPI }) => {
  const kpiLabel = {
    avgPrice: "Price",
    avgDiscoveryTime: "Discovery Time",
    avgRTR: "Performance (RTR)",
    avgSR: "Performance (SR)",
  };

  const sortedOrchestrators = [...orchestrators].sort((a, b) => {
    if (!a[selectedKPI] || !b[selectedKPI]) return 0;
    return a[selectedKPI] - b[selectedKPI];
  });

  return (
    <div className="ranking-table">
      <h2>Ranking Table</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Orchestrator</th>
            <th>{kpiLabel[selectedKPI]}</th>
          </tr>
        </thead>
        <tbody>
          {sortedOrchestrators.map((orchestrator, index) => (
            orchestrator[selectedKPI] !== null && orchestrator[selectedKPI] >= 0.0 && <tr key={orchestrator.id}>
              <td>{index + 1}</td>
              <td>{orchestrator.name}</td>
              <td>
                {orchestrator[selectedKPI].toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

RankingTable.propTypes = {
  orchestrators: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      avgPrice: PropTypes.number,
      avgDiscoveryTime: PropTypes.number,
      avgRTR: PropTypes.number,
      avgSR: PropTypes.number,
    })
  ).isRequired,
  selectedKPI: PropTypes.oneOf(["avgPrice", "avgDiscoveryTime", "avgRTR", "avgSR"]).isRequired,
};

export default RankingTable;
