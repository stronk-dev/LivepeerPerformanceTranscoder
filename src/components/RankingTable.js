import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import "./RankingTable.css";

const RankingTable = ({ orchestrators, selectedKPI }) => {
  const [selectedRegion, setSelectedRegion] = useState("global");

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
            return instance.regions;

          }
        }
        )
      )
    ),
  ];

  // Handle dropdown change
  const handleRegionChange = (event) => {
    setSelectedRegion(event.target.value);
  };

  // Validate and filter orchestrators based on the selected KPI and region
  const validOrchestrators = orchestrators.filter((orch) => {
    // If global, return all orchestrators with valid KPI values
    if (selectedRegion === "global") {
      return orch[selectedKPI] !== undefined && orch[selectedKPI] > 0.0;
    }

    // If filtering by specific region
    return orch.instances.some((instance) => {
      if (selectedKPI === "avgRTR") {
        return (
          instance.livepeer_regions.includes(selectedRegion) &&
          instance.avgRTRByRegion[selectedRegion] !== undefined &&
          instance.avgRTRByRegion[selectedRegion] > 0.0
        );
      } else {
        return (
          instance.regions.includes(selectedRegion) &&
          instance.avgPriceByRegion[selectedRegion] !== undefined &&
          instance.avgPriceByRegion[selectedRegion] > 0.0
        );
      }
    });
  });

  const sortedOrchestrators = [...validOrchestrators].sort((a, b) => {
    const valueA = a[selectedKPI] >= 0 ? a[selectedKPI] : Infinity;
    const valueB = b[selectedKPI] >= 0 ? b[selectedKPI] : Infinity;
    return valueA - valueB; // Ascending
  });

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
              const instance = orchestrator.instances.find((inst) =>
                selectedKPI === "avgRTR"
                  ? inst.livepeer_regions.includes(selectedRegion)
                  : inst.regions.includes(selectedRegion)
              );
              if (instance) {
                value = selectedKPI === "avgRTR"
                  ? instance.avgRTRByRegion[selectedRegion]
                  : instance.avgPriceByRegion[selectedRegion];
              }
            }

            return (
              <tr key={orchestrator.id}>
                <td>{index + 1}</td>
                <td>{orchestrator.name}</td>
                <td>{value >= 0 ? value?.toFixed(2) || 0 : "?"}</td>
              </tr>
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
