import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, Tooltip } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import "leaflet/dist/leaflet.css";
import "react-leaflet-markercluster/dist/styles.min.css";
import L from "leaflet";
import "./WorldMap.css";
import TimeAgo from 'react-timeago';

// Hardcoded probe region pins
const probeRegions = [
  { name: "US West", latitude: 34.04805, longitude: -118.25419 },
  { name: "US East", latitude: 44.933746, longitude: -84.525240 },
  { name: "EU West", latitude: 52.378, longitude: 4.9 },
  { name: "India", latitude: 19.077793, longitude: 72.878723 },
  { name: "South America", latitude: -23.552139, longitude: -46.647198 },
  { name: "South-East Asia", latitude: 1.351616, longitude: 103.808053 },
  { name: "Oceania", latitude: -33.868728, longitude: 151.206953 },
  { name: "Japan", latitude: 35.764784, longitude: 139.148599 },
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
          <p>Address: {orchObj.id}</p>
          {orchObj.name != orchObj.id && <p>ENS: {orchObj.name}</p>}
          <div><strong>KPI score:</strong> {instanceScore.toFixed(4) * 100}%</div>
          <hr />
          <strong>Global Stats:</strong>
          <p>Discovery Time: {orchObj.avgDiscoveryTime.toPrecision(3)} ms</p>
          <p>Price: {orchObj.avgPrice.toPrecision(3)}</p>
          <p>RTR: {orchObj.avgRTR.toFixed(1)}</p>
          <p>SR: {orchObj.avgSR.toFixed(1)}</p>
          <hr />
          <strong>Instance Stats:</strong>
          <p>IP: {instanceObj.id}</p>
          <div>Last Ping: <TimeAgo
            date={instanceObj.lastPing}
            component={"p"}
            minPeriod={60}
            style={{}}
          /></div>
          <p>Discovery Time: {instanceObj.bestDiscoveryTime.toPrecision(3)} ms</p>
          <p>Price: {instanceObj.price.toPrecision(3)}</p>
          <p>RTR: {instanceObj.avgRTR.toFixed(1)}</p>
          <p>SR: {instanceObj.avgSR.toFixed(1)}</p>
          <hr />
          <div><strong>Probed From:</strong> {instanceObj.probedFrom.map((location) => <p>{location}</p>)}</div>
        </div>
      )}
    </div>
  );
};

// Side panel to show selected cluster or marker details
const SidePanel = ({ selectedData, onClose }) => {
  if (!selectedData) return null;

  return (
    <div className="side-panel">
      <button onClick={onClose} className="close-button">
        Close
      </button>
      {Array.isArray(selectedData) ? (
        // Cluster is selected
        <div className="accordion">
          {selectedData.map((marker, index) => (
            <AccordionItem
              key={index}
              instanceScore={marker.options.options.instanceScore}
              orchObj={marker.options.options.orchObj}
              instanceObj={marker.options.options.instanceObj}
            />
          ))}
        </div>
      ) : (
        // Single marker is selected
        <AccordionItem
          instanceScore={selectedData.instanceScore}
          orchObj={selectedData.orchObj}
          instanceObj={selectedData.instanceObj}
          startExpanded={true}
        />
      )}
    </div>
  );
};

const WorldMap = ({ orchestrators, selectedKPI }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedData, setSelectedData] = useState(null);

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

    let size = Math.min(20 + childCount * 2, 80);
    const color = getPinColor(avgScore);

    return L.divIcon({
      className: "dummy",
      html: `<div class="custom-pin" style="background-color: ${color}; width: ${size}px; height: ${size}px; line-height: ${size}px;">${childCount}</div>`,
    });
  };

  // Filter orchestrators based on search term
  const validOrchestrators = orchestrators.filter((orch) =>
    orch.instances.every(
      (instance) =>
        instance.latitude !== undefined &&
        instance.longitude !== undefined
    )
  );

  const filteredOrchestrators = validOrchestrators.filter((orch) =>
    orch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    orch.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="world-map-container">
      {/* Search Bar */}
      <div className="controls">
        <input
          type="text"
          placeholder="Search orchestrators..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Map and Side Panel */}
      <div className="map-and-panel">
        {/* Map Component */}
        <MapContainer
          zoom={4}
          center={[52.378, 4.9]}
          maxZoom={10}
          minZoom={2}
          style={{ height: "100%", width: selectedData ? "70%" : "100%" }} // Adjust width based on side panel
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
            }}
          >
            {filteredOrchestrators.map((orch) =>
              orch.instances.map((instance, index) => (
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
                      }; width: ${selectedData?.instanceObj?.id === instance.id ? "36px" :
                        "24px"
                      }; height: ${selectedData?.instanceObj?.id === instance.id ? "36px" :
                        "24px"
                      }; border-radius: 50%;"></div>`,
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
                    <strong>{instance.id}</strong>
                    <br />
                    Orchestrator node
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
                html: `<div class="probe-pin""></div>`,
              })}
            >
              <Tooltip>
                <strong>{region.name}</strong>
                <br />
                Stronk Origin
              </Tooltip>
            </Marker>
          ))}
        </MapContainer>

        {/* Side Panel */}
        <SidePanel selectedData={selectedData} onClose={() => setSelectedData(null)} />
      </div>
    </div>
  );
};

export default WorldMap;
