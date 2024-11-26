import React from "react";
import PropTypes from "prop-types";
import "./RankingTable.css";

const RankingTable = ({ orchestrators, selectedKPI }) => {
  const kpiLabel = {
    avgPrice: "Price",
    avgDiscoveryTime: "Discovery Time",
    avgRTR: "Realtime ratio",
  };

  // Validate data
  const validOrchestrators = orchestrators.filter((orch) =>
    orch[selectedKPI] !== undefined && orch[selectedKPI] > 0.0
  );

  const sortedOrchestrators = [...validOrchestrators].sort((a, b) => {
    const valueA = a[selectedKPI] >= 0 ? a[selectedKPI] : Infinity;
    const valueB = b[selectedKPI] >= 0 ? b[selectedKPI] : Infinity;
    return valueA - valueB; // Ascending
  });

  return (
    <div className="ranking-table">
      <h4>Ranking Table</h4>
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
            <tr key={orchestrator.id}>
              <td>{index + 1}</td>
              <td>{orchestrator.name}</td>
              <td>
                {orchestrator[selectedKPI] >= 0 ? orchestrator[selectedKPI]?.toFixed(2) || 0 : "?"}
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
  selectedKPI: PropTypes.oneOf(["avgPrice", "avgDiscoveryTime", "avgRTR"]).isRequired,
};

export default RankingTable;
