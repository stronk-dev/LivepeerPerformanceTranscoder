import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import "leaflet/dist/leaflet.css";
import "react-leaflet-markercluster/dist/styles.min.css";
import L from "leaflet";
import "./WorldMap.css";

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
          <p>Instance KPI: {instanceScore?.toFixed(2) || "N/A"}</p>
          <p>Orchestrator Name: {orchObj.name}</p>
          <p>Orchestrator ID: {orchObj.id}</p>
          <p>Average Discovery Time: {orchObj.avgDiscoveryTime}</p>
          <p>Average Performance: {orchObj.avgPerformance}</p>
          <p>Average Price: {orchObj.avgPrice}</p>
          <p>Average RTR: {orchObj.avgRTR}</p>
          <p>Average SR: {orchObj.avgSR}</p>
          <p>Normalized Discovery Time: {orchObj.normalizedDiscoveryTime}</p>
          <p>Normalized Price: {orchObj.normalizedPrice}</p>
          <p>Normalized RTR: {orchObj.normalizedRTR}</p>
          <p>Instance Average Performance: {instanceObj.avgPerformance}</p>
          <p>Instance Average RTR: {instanceObj.avgRTR}</p>
          <p>Instance Average SR: {instanceObj.avgSR}</p>
          <p>Instance ID: {instanceObj.id}</p>
          <p>Instance Last Ping: {instanceObj.lastPing}</p>
          <p>Instance Normalized Discovery Time: {instanceObj.normalizedDiscoveryTime}</p>
          <p>Instance Normalized Price: {instanceObj.normalizedPrice}</p>
          <p>Instance Normalized RTR: {instanceObj.normalizedRTR}</p>
          <p>Instance Price: {instanceObj.price}</p>
          <p>Instance Probed From: {instanceObj.probedFrom}</p>
          <p>Instance Regions: {instanceObj.regions}</p>
        </div>
      )}
    </div>
  );
};

// Side panel to show selected cluster or marker details
const SidePanel = ({ selectedData, onClose }) => {
  if (!selectedData) return null;

  console.log(selectedData);

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

  // Helper to determine pin color based on KPI score
  const getPinColor = (score, isSelected) => {
    if (isSelected) return 'yellow'; // Highlight selected item with yellow
    if (score === null || score === undefined) return "gray"; // Default for missing data
    const normalized = Math.min(Math.max(score, 0), 1); // Normalize to [0, 1]
    const red = Math.round(255 * (1 - normalized));
    const green = Math.round(255 * normalized);
    return `rgb(${red}, ${green}, 0)`; // Gradient from red to green
  };

  // Custom cluster icon
  const createClusterCustomIcon = (cluster, isSelected) => {
    const childCount = cluster.getChildCount();
    const avgScore = (
      cluster
        .getAllChildMarkers()
        .map((marker) => marker.options.options.instanceScore || 0)
        .reduce((sum, score) => sum + score, 0) / childCount
    ).toFixed(2);

    const size = Math.min(20 + childCount * 2, 80);
    const color = getPinColor(avgScore, isSelected);

    return L.divIcon({
      html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; line-height: ${size}px; border-radius: 50%; border: 3px solid white; text-align: center; color: white; font-size: 12px;">${childCount}</div>`,
      className: "custom-cluster",
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
            iconCreateFunction={(cluster) => createClusterCustomIcon(cluster, cluster === selectedData)}
            eventHandlers={{
              clusterclick: (e) => {
                const cluster = e.layer;
                const markers = cluster.getAllChildMarkers();
                setSelectedData(markers);
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
                    className: "custom-pin",
                    html: `<div style="background-color: ${getPinColor(
                      instance[selectedKPI],
                      selectedData === instance
                    )}; width: 12px; height: 12px; border-radius: 50%;"></div>`,
                  })}
                  eventHandlers={{
                    click: () => {
                      setSelectedData({
                        instanceScore: instance[selectedKPI],
                        orchObj: orch,
                        instanceObj: instance,
                      });
                    },
                  }}
                />
              ))
            )}
          </MarkerClusterGroup>

          {/* Probe Region Pins */}
          {probeRegions.map((region, index) => (
            <Marker
              key={`probe-region-${index}`}
              position={[region.latitude, region.longitude]}
              icon={L.divIcon({
                className: "probe-pin",
                html: `<div style="background-color: blue; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white;"></div>`,
              })}
            >
              <Popup>
                <strong>{region.name}</strong>
                <br />
                Stronk Origin
              </Popup>
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
