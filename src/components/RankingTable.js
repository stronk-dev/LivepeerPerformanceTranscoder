import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import "./RankingTable.css";

const RankingTable = ({ orchestrators, selectedKPI }) => {
  const [selectedRegion, setSelectedRegion] = useState("global");
  const [expandedOrchestrator, setExpandedOrchestrator] = useState(null);

  // Set initial position once when parentRef becomes available
  useEffect(() => {
    setSelectedRegion("global");
  }, [selectedKPI]);

  const kpiLabel = {
    avgPrice: "Price",
    avgDiscoveryTime: "Discovery Time",
    avgRTR: "Realtime Ratio",
  };

  // Extract unique regions for dropdown options
  const uniqueRegions = [
    "global",
    ...new Set(
      orchestrators.flatMap((orch) =>
        orch.instances.flatMap((instance) => {
          if (selectedKPI === "avgRTR") {
            return instance.livepeer_regions;
          } else {
            return instance.probedFrom;
          }
        })
      )
    ),
  ];

  // Handle dropdown change
  const handleRegionChange = (event) => {
    setSelectedRegion(event.target.value);
  };

  // Handle row expansion
  const handleRowClick = (orchestratorId) => {
    setExpandedOrchestrator(expandedOrchestrator === orchestratorId ? null : orchestratorId);
  };

  // Validate and filter orchestrators based on the selected KPI and region
  const validOrchestrators = orchestrators.filter((orch) => {
    // If global, return all orchestrators with valid KPI values
    if (selectedRegion === "global") {
      return orch[selectedKPI] !== undefined && orch[selectedKPI] > 0.0;
    }

    // If filtering by specific region
    if (selectedKPI === "avgRTR") {
      return (
        orch.bestRTRByRegion &&
        orch.bestRTRByRegion[selectedRegion] !== undefined &&
        orch.bestRTRByRegion[selectedRegion] > 0.0
      );
    } else if (selectedKPI === "avgDiscoveryTime") {
      return (
        orch.bestDiscoveryTimeByRegion &&
        orch.bestDiscoveryTimeByRegion[selectedRegion] !== undefined &&
        orch.bestDiscoveryTimeByRegion[selectedRegion] > 0.0
      );
    } else {
      return (
        orch.bestPriceByRegion &&
        orch.bestPriceByRegion[selectedRegion] !== undefined &&
        orch.bestPriceByRegion[selectedRegion] > 0.0
      );
    }
  });

  const sortedOrchestrators = [...validOrchestrators].sort((a, b) => {
    if (selectedRegion === "global") {
      const valueA = a[selectedKPI] >= 0 ? a[selectedKPI] : Infinity;
      const valueB = b[selectedKPI] >= 0 ? b[selectedKPI] : Infinity;
      return valueA - valueB; // Ascending
    }
    if (selectedKPI === "avgRTR") {
      const valueA = a["bestRTRByRegion"] && a["bestRTRByRegion"][selectedRegion] >= 0 ? a["bestRTRByRegion"][selectedRegion] : Infinity;
      const valueB = b["bestRTRByRegion"] && b["bestRTRByRegion"][selectedRegion] >= 0 ? b["bestRTRByRegion"][selectedRegion] : Infinity;
      return valueA - valueB; // Ascending
    }
    if (selectedKPI === "avgDiscoveryTime") {
      const valueA = a["bestDiscoveryTimeByRegion"] && a["bestDiscoveryTimeByRegion"][selectedRegion] >= 0 ? a["bestDiscoveryTimeByRegion"][selectedRegion] : Infinity;
      const valueB = b["bestDiscoveryTimeByRegion"] && b["bestDiscoveryTimeByRegion"][selectedRegion] >= 0 ? b["bestDiscoveryTimeByRegion"][selectedRegion] : Infinity;
      return valueA - valueB; // Ascending
    }
    if (selectedKPI === "avgPrice") {
      const valueA = a["bestPriceByRegion"] && a["bestPriceByRegion"][selectedRegion] >= 0 ? a["bestPriceByRegion"][selectedRegion] : Infinity;
      const valueB = b["bestPriceByRegion"] && b["bestPriceByRegion"][selectedRegion] >= 0 ? b["bestPriceByRegion"][selectedRegion] : Infinity;
      return valueA - valueB; // Ascending
    }
    const valueA = a[selectedKPI] >= 0 ? a[selectedKPI] : Infinity;
    const valueB = b[selectedKPI] >= 0 ? b[selectedKPI] : Infinity;
    return valueA - valueB; // Ascending
  });

  const convertWeiToEthPerHour = (weiPerPixel) => {
    const ETH_PER_PIXEL_PER_SECOND = weiPerPixel / 1e18;
    const PIXELS_PER_SECOND = 1920 * 1080 * 30;
    const SECONDS_PER_HOUR = 3600;
    return ETH_PER_PIXEL_PER_SECOND * PIXELS_PER_SECOND * SECONDS_PER_HOUR;
  };

  return (
    <div className="ranking-table">
      <h4>Ranking Table</h4>

      {/* Dropdown for Region Selection */}
      <div className="region-selector">
        <label htmlFor="region-select">Select Region:</label>
        <select id="region-select" value={selectedRegion} onChange={handleRegionChange}>
          {uniqueRegions.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Orchestrator</th>
            <th>{kpiLabel[selectedKPI]}</th>
          </tr>
        </thead>
        <tbody>
          {sortedOrchestrators.map((orchestrator, index) => {
            // Determine which value to display based on selected region
            let value = 0;

            if (selectedRegion === "global") {
              value = orchestrator[selectedKPI];
            } else {
              if (selectedKPI === "avgRTR") {
                value = orchestrator.bestRTRByRegion[selectedRegion];
              } else if (selectedKPI === "avgDiscoveryTime") {
                value = orchestrator.bestDiscoveryTimeByRegion[selectedRegion];
              } else {
                value = orchestrator.bestPriceByRegion[selectedRegion];
              }
            }

            const ethPerHour = selectedKPI === "avgPrice" ? convertWeiToEthPerHour(value) : null;
            const formattedValue = selectedKPI === "avgPrice" ? ethPerHour * 3000 : value;

            return (
              <React.Fragment key={orchestrator.id}>
                <tr onClick={() => handleRowClick(orchestrator.id)}>
                  <td>{index + 1}</td>
                  <td>{orchestrator.name}</td>
                  <td>{selectedKPI == "avgPrice" ? "$" : ""}{formattedValue >= 0 ? formattedValue?.toFixed(3) || 0 : "?"}{selectedKPI == "avgDiscoveryTime" ? " ms" : ""}</td>
                </tr>
                {expandedOrchestrator === orchestrator.id && (
                  <tr className="expanded-row">
                    <td colSpan="3">
                      <div className="expanded-content">
                        {selectedKPI === "avgPrice" && (
                          <p>
                            <strong>Wei per pixel:</strong> {value.toFixed(0)} Wei<br />
                            <strong>Converted Price:</strong> {ethPerHour?.toFixed(8)} ETH/hr at 1080p 30fps<br />
                            <strong>Price in Dollars:</strong> ${(ethPerHour * 3000)?.toFixed(3)} (assuming 1 ETH = 3000 USD)
                          </p>
                        )}
                        {selectedKPI === "avgDiscoveryTime" && (
                          <p>Discovery time is measured in milliseconds (ms).</p>
                        )}
                        {selectedKPI === "avgRTR" && (
                          <p>Realtime ratio (RTR) indicates the performance of the orchestrator.</p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
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
      instances: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          regions: PropTypes.arrayOf(PropTypes.string).isRequired,
          livepeer_regions: PropTypes.arrayOf(PropTypes.string).isRequired,
          price: PropTypes.number,
          avgRTR: PropTypes.number,
          avgPriceByRegion: PropTypes.object,
          avgDiscoveryTimeByRegion: PropTypes.object,
          avgRTRByRegion: PropTypes.object,
        })
      ).isRequired,
    })
  ).isRequired,
  selectedKPI: PropTypes.oneOf(["avgPrice", "avgDiscoveryTime", "avgRTR"]).isRequired,
};

export default RankingTable;
