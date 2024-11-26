import React, { useRef, useState } from "react";
import DvdLogo from "../components/DvdLogo";
import LoadingScreen from "../components/loadingScreen";
import RankingTable from "../components/RankingTable";
import Histogram from "../components/Histogram";
import WorldMap from "../components/WorldMap";
import useProcessedData from "../hooks/useProcessedData";
import { FaDollarSign, FaClock, FaChartLine, FaMap, FaTable, FaChartBar } from 'react-icons/fa';
import "./home.css";

const Home = () => {
  const rootContainerRef = useRef(null);
  const { isLoading, isError, processedData } = useProcessedData();

  const [activeKPI, setKPI] = useState("discovery-time");
  const [activeView, setView] = useState("map");

  const getTitle = () => {
    switch (activeKPI) {
      case "pricing":
        return "Pricing";
      case "discovery-time":
        return "Discovery Time";
      case "performance":
        return "Performance";
      default:
        return "UNKOWN";
    }
  }

  const renderKPIContent = () => {
    switch (activeView) {
      case "table":
        {
          const selectedKPI = activeKPI === "pricing" ? "avgPrice" :
            activeKPI === "discovery-time" ? "avgDiscoveryTime" :
              activeKPI === "performance" ? "avgRTR" : null;
          return (
            <div className="scrollable-content">
              <div className="tab-content">
                <section className="ranking-section">
                  <h4>{getTitle()} Ranking</h4>
                  {activeKPI == "pricing" ? <span>(for 1 hour of 1080p 30fps, assuming 1 ETH = 3000 USD)</span> : ""}
                  <RankingTable orchestrators={processedData.orchestrators} selectedKPI={selectedKPI} />
                </section>
              </div>
            </div>
          );
        }
      case "map":
        {
          const selectedKPI = activeKPI === "pricing" ? "normalizedPrice" :
            activeKPI === "discovery-time" ? "normalizedDiscoveryTime" :
              activeKPI === "performance" ? "normalizedRTR" : null;
          return (
            <div className="tab-content">
              <WorldMap orchestrators={processedData.orchestrators} selectedKPI={selectedKPI} />
            </div>
          );
        }
      case "distribution":
        {
          const selectedKPI = activeKPI === "pricing" ? "pricing" :
            activeKPI === "discovery-time" ? "discoveryTime" :
              activeKPI === "performance" ? "performanceRTR" : null;
          return (
            <div className="scrollable-content">
              <div className="tab-content">
                <section className="histogram-section">
                  <h4>{getTitle()} Charts</h4>
                  <Histogram aggregateData={processedData.aggregates} selectedKPI={selectedKPI} />
                </section>
              </div>
            </div>
          );
        }
    }
  };

  if (isLoading || isError) {
    return (
      <LoadingScreen
        isError={isError}
        className={`loading-screen ${isError ? "error" : ""}`}
      />
    );
  }

  return (
    <div ref={rootContainerRef} className="home-root">
      <DvdLogo parentRef={rootContainerRef} />
      <header className="header-bar">
        <div className="tabs">
          <button
            className={`tab ${activeKPI === "pricing" ? "active" : ""}`}
            onClick={() => setKPI("pricing")}
          >
            <FaDollarSign className="tab-icon" />
            Pricing
          </button>
          <button
            className={`tab ${activeKPI === "discovery-time" ? "active" : ""}`}
            onClick={() => setKPI("discovery-time")}
          >
            <FaClock className="tab-icon" />
            Discovery Time
          </button>
          <button
            className={`tab ${activeKPI === "performance" ? "active" : ""}`}
            onClick={() => setKPI("performance")}
          >
            <FaChartLine className="tab-icon" />
            Performance
          </button>
        </div>
        <div className="tabs">
          <button
            className={`tab ${activeView === "table" ? "active" : ""}`}
            onClick={() => setView("table")}
          >
            <FaTable className="tab-icon" />
            Ranking
          </button>
          <button
            className={`tab ${activeView === "map" ? "active" : ""}`}
            onClick={() => setView("map")}
          >
            <FaMap className="tab-icon" />
            World Map
          </button>
          <button
            className={`tab ${activeView === "distribution" ? "active" : ""}`}
            onClick={() => setView("distribution")}
          >
            <FaChartBar className="tab-icon" />
            Distribution
          </button>
        </div>
      </header>
      {renderKPIContent()}
    </div>
  );
};

export default Home;
