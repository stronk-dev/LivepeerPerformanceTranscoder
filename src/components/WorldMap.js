import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Tooltip } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import "leaflet/dist/leaflet.css";
import "react-leaflet-markercluster/dist/styles.min.css";
import L from "leaflet";
import "./WorldMap.css";
import TimeAgo from 'react-timeago';
import { FaBroadcastTower, FaServer } from 'react-icons/fa';
import ReactDOMServer from 'react-dom/server';
const broadcastTowerIconHTML = ReactDOMServer.renderToString(<FaBroadcastTower />);
const serverIconHTML = ReactDOMServer.renderToString(<FaServer />);

// Hardcoded probe region pins
const probeRegions = [
  { name: "US West", latitude: 33.947479, longitude: -118.339828 },
  { name: "US East", latitude: 40.919570, longitude: -73.864723 },
  { name: "EU West", latitude: 52.362291, longitude: 4.883001 },
  { name: "India", latitude: 19.015515, longitude: 72.851424 },
  { name: "South America", latitude: -23.561338, longitude: -46.680156 },
  { name: "South-East Asia", latitude: 1.255284, longitude: 103.820197 },
  { name: "Oceania", latitude: -33.868910, longitude: 151.192494 },
  { name: "Japan", latitude: 35.595941, longitude: 139.745076 },
];

// Component to render a single accordion item with full details
const AccordionItem = ({ instanceScore, orchObj, instanceObj, startExpanded }) => {
  const [isExpanded, setIsExpanded] = useState(startExpanded || false);
  return (
    <div className="accordion-item-wrapper">
      <div className="accordion-item-header" onClick={() => setIsExpanded(!isExpanded)}>
        <strong>{orchObj.name}</strong>
        <span className="accordion-icon">{isExpanded ? "-" : "+"}</span>
      </div>
      {isExpanded && (
        <div className="accordion-item-details">
          <strong>{orchObj.id}</strong>
          <div className="accordion-item-row">
            <span className="item-key">KPI Score:</span>
            <span className="item-value">{(instanceScore * 100).toFixed(1)}%</span>
          </div>
          <hr />
          <div className="accordion-section-title">Global Stats:</div>
          <div className="accordion-item-row">
            <span className="item-key">Discovery Time:</span>
            <span className="item-value">{orchObj.avgDiscoveryTime.toPrecision(3)} ms</span>
          </div>
          <div className="accordion-item-row">
            <span className="item-key">Price:</span>
            <span className="item-value">{orchObj.avgPrice.toPrecision(3)} PPP</span>
          </div>
          <div className="accordion-item-row">
            <span className="item-key">RTR:</span>
            <span className="item-value">{orchObj.avgRTR.toFixed(1)}</span>
          </div>
          <div className="accordion-item-row">
            <span className="item-key">SR:</span>
            <span className="item-value">{(orchObj.avgSR * 100).toFixed(1)}%</span>
          </div>
          <hr />
          <div className="accordion-section-title">Instance Stats:</div>
          <div className="accordion-item-row">
            <span className="item-key">IP:</span>
            <span className="item-value">{instanceObj.id}</span>
          </div>
          <div className="accordion-item-row">
            <span className="item-key">Last Ping:</span>
            <span className="item-value">
              <TimeAgo date={instanceObj.lastPing} component={"p"} minPeriod={60} />
            </span>
          </div>
          <div className="accordion-item-row">
            <span className="item-key">Discovery Time:</span>
            <span className="item-value">{instanceObj.bestDiscoveryTime.toPrecision(3)} ms</span>
          </div>
          <div className="accordion-item-row">
            <span className="item-key">Price:</span>
            <span className="item-value">{instanceObj.price.toPrecision(3)} PPP</span>
          </div>
          <div className="accordion-item-row">
            <span className="item-key">RTR:</span>
            <span className="item-value">{instanceObj.avgRTR.toFixed(1)}</span>
          </div>
          <div className="accordion-item-row">
            <span className="item-key">SR:</span>
            <span className="item-value">{(instanceObj.avgSR * 100).toFixed(1)}%</span>
          </div>
          <hr />
          <div><strong>Probed From:</strong> {instanceObj.probedFrom.map((location) => <p key={instanceObj.id + location}>{location}</p>)}</div>
        </div>
      )}
    </div>
  );
};

// Helper function to group instances by instance.id
const groupInstancesById = (markers) => {
  return markers.reduce((acc, marker) => {
    const instanceId = marker.options.options.instanceObj.id;

    if (!acc[instanceId]) {
      acc[instanceId] = [];
    }
    acc[instanceId].push(marker);

    return acc;
  }, {});
};

// Side panel to show selected cluster or marker details
const SidePanel = ({ selectedData, onClose }) => {
  if (!selectedData) return null;

  // Group the markers by instance ID if a cluster is selected
  const groupedData = Array.isArray(selectedData) ? groupInstancesById(selectedData) : null;

  return (
    <div className="side-panel">
      <button onClick={onClose} className="close-button">
        Close
      </button>
      {Array.isArray(selectedData) ? (
        // Cluster is selected, group by instance ID
        <div className="accordion-container">
          {Object.keys(groupedData).map((instanceId) => (
            <div key={instanceId} className="accordion-item-wrapper">
              <strong>{instanceId}</strong>
              <div className="accordion-item-details">
                {groupedData[instanceId].map((marker, index) => (
                  <AccordionItem
                    key={index}
                    instanceScore={marker.options.options.instanceScore}
                    orchObj={marker.options.options.orchObj}
                    instanceObj={marker.options.options.instanceObj}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Single marker is selected
        <div className="accordion-container">
          <strong>{selectedData.instanceObj.id}</strong>
          <div className="accordion-item-details">
            <AccordionItem
              instanceScore={selectedData.instanceScore}
              orchObj={selectedData.orchObj}
              instanceObj={selectedData.instanceObj}
              startExpanded={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const WorldMap = ({ orchestrators, selectedKPI }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedData, setSelectedData] = useState(null);

  // Set initial position once when parentRef becomes available
  useEffect(() => {
    setSelectedData(null);
  }, [selectedKPI]);

  const interpolateColor = (score) => {
    const startColor = [247, 118, 142];
    const endColor = [115, 218, 202];
    const r = Math.round(startColor[0] + (endColor[0] - startColor[0]) * score);
    const g = Math.round(startColor[1] + (endColor[1] - startColor[1]) * score);
    const b = Math.round(startColor[2] + (endColor[2] - startColor[2]) * score);
    return `rgb(${r}, ${g}, ${b})`;
  };

  // Helper to determine pin color based on KPI score
  const getPinColor = (score) => {
    if (score === null || score === undefined || score <= 0) return "gray"; // Default for missing data
    const normalized = Math.min(Math.max(score, 0), 1); // Normalize to [0, 1]
    return interpolateColor(normalized);
  };

  // Custom cluster icon
  const createClusterCustomIcon = (cluster) => {
    const childCount = cluster.getChildCount();
    const childMarkers = cluster.getAllChildMarkers();

    const avgScore = (
      childMarkers
        .map((marker) => {
          const instanceScore = marker.options.options.instanceScore;
          return instanceScore !== null && instanceScore !== undefined
            ? Math.min(Math.max(instanceScore, 0), 1)
            : 0;
        })
        .reduce((sum, score) => sum + score, 0) / childCount
    ).toFixed(2);

    let size = Math.min(36 + childCount * 2, 96);
    const color = getPinColor(avgScore);

    return L.divIcon({
      className: "dummy",
      html: `<div class="custom-pin" style="background-color: ${color}; width: ${size}px; height: ${size}px; line-height: ${size}px;">${childCount}</div>`,
    });
  };

  const filteredOrchestrators = orchestrators.filter((orch) =>
    orch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    orch.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="map-and-panel">
      <div
        className={`world-map-container ${selectedData ? "sidebar-open" : ""
          }`}
      >
        {/* Search Bar */}
        <div className="controls">
          <input
            type="text"
            placeholder="Search orchestrators..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Map Component */}
        <MapContainer
          zoom={4}
          center={[52.378, 4.9]}
          maxZoom={12}
          minZoom={2}
          style={{ height: "100%", width: "100%" }}
        >
          {/* Dark Theme Tiles */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
            subdomains={["a", "b", "c"]}
          />

          {/* Clustered Markers */}
          <MarkerClusterGroup
            showCoverageOnHover={false}
            spiderfyOnMaxZoom={false}
            zoomToBoundsOnClick={false}
            iconCreateFunction={(cluster) => createClusterCustomIcon(cluster)}
            eventHandlers={{
              clusterclick: (e) => {
                const cluster = e.layer;
                const markers = cluster.getAllChildMarkers();
                if (!selectedData || !Array.isArray(selectedData)) {
                  setSelectedData(markers);
                  return;
                }
                const notChanged = Array.isArray(selectedData) && selectedData.length == markers.length &&
                  selectedData.every((marker, index) => marker._leaflet_id === markers[index]._leaflet_id) || false;
                if (!notChanged) {
                  setSelectedData(markers);
                } else {
                  setSelectedData(null);
                }
              },
              clustermouseover: (e) => {
                const cluster = e.layer;
                const count = cluster.getChildCount();
                const markers = cluster.getAllChildMarkers();

                const avgScore = (
                  markers
                    .map((marker) => {
                      const instanceScore = marker.options.options.instanceScore;
                      return instanceScore !== null && instanceScore !== undefined
                        ? Math.min(Math.max(instanceScore, 0), 1)
                        : 0;
                    })
                    .reduce((sum, score) => sum + score, 0) / count
                );

                const tooltipContent = ReactDOMServer.renderToString(
                  <div>
                    <strong>Orchestrator cluster</strong>
                    <br />
                    {count} instances
                    <br />
                    Averaging a score of {(avgScore * 100).toFixed(1)}%
                  </div>
                );
                e.propagatedFrom.bindTooltip(tooltipContent).openTooltip();
              },
              clustermouseout: (e) => {
                e.propagatedFrom.unbindTooltip();
              },
            }}
          >
            {filteredOrchestrators.map((orch) =>
              orch.instances.map((instance, index) => instance.latitude && instance.longitude && instance.latitude != -1 && instance.longitude != -1 && (
                <Marker
                  key={`${orch.name}-${index}`}
                  position={[instance.latitude, instance.longitude]}
                  options={{
                    instanceScore: instance[selectedKPI],
                    orchObj: orch,
                    instanceObj: instance,
                  }}
                  icon={L.divIcon({
                    className: "dummy",
                    html: `<div class="custom-pin" style="background-color: ${selectedData?.instanceObj?.id === instance.id ? "var(--magenta)" :
                      getPinColor(instance[selectedKPI])
                      }; width: ${selectedData?.instanceObj?.id === instance.id ? "48px" : "36px"
                      }; height: ${selectedData?.instanceObj?.id === instance.id ? "48px" : "36px"
                      }; border-radius: 50%;">${serverIconHTML}</div>`,
                  })}
                  eventHandlers={{
                    click: () => {
                      if (!selectedData || Array.isArray(selectedData) || selectedData.instanceObj.id != instance.id) {
                        setSelectedData({
                          instanceScore: instance[selectedKPI],
                          orchObj: orch,
                          instanceObj: instance,
                        });
                      } else {
                        setSelectedData(null);
                      }
                    },
                  }}
                >
                  <Tooltip>
                    <strong>Orchestrator node</strong>
                    <br />
                    {instance.id}
                    <br />
                    Averaging a score of {(instance[selectedKPI] * 100).toFixed(1)}%
                  </Tooltip>
                </Marker>
              ))
            )}
          </MarkerClusterGroup>

          {/* Probe Region Pins */}
          {probeRegions.map((region, index) => (
            <Marker
              key={`probe-region-${index}`}
              position={[region.latitude, region.longitude]}
              icon={L.divIcon({
                className: 'dummy',
                html: `<div class="probe-pin">${broadcastTowerIconHTML}</div>`,
              })}
            >
              <Tooltip>
                <strong>Stronk Origin</strong>
                <br />
                {region.name}
              </Tooltip>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Side Panel */}
      {selectedData && (
        <SidePanel selectedData={selectedData} onClose={() => setSelectedData(null)} />
      )}
    </div>
  );
};

export default WorldMap;
