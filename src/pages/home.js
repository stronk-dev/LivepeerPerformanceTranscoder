import React, { useRef, useState } from "react";
import DvdLogo from "../components/DvdLogo";
import LoadingScreen from "../components/loadingScreen";
import RankingTable from "../components/RankingTable";
import useProcessedData from "../hooks/useProcessedData";
import "./home.css";

const Home = () => {
  const rootContainerRef = useRef(null);
  const { isLoading, isError, processedData } = useProcessedData();

  const [activeTab, setActiveTab] = useState("pricing");

  const renderTabContent = () => {
    const selectedKPI = activeTab === "pricing" ? "avgPrice" :
      activeTab === "discovery-time" ? "avgDiscoveryTime" :
        activeTab === "performance" ? "avgRTR" : null;
    switch (activeTab) {
      case "pricing":
        return (
          <div className="tab-content">
            <section className="ranking-section">
              <h3>Pricing Ranking</h3>
              <RankingTable orchestrators={processedData.orchestrators} selectedKPI={selectedKPI} />
            </section>
            <section className="map-section">
              <h3>Interactive World Map</h3>
              {/* Placeholder for Map Component */}
            </section>
            <section className="histogram-section">
              <h3>Pricing Histogram</h3>
              {/* Placeholder for Histogram Component */}
            </section>
          </div>
        );
      case "discovery-time":
        return (
          <div className="tab-content">
            <section className="ranking-section">
              <h3>Discovery Time Ranking</h3>
              <RankingTable orchestrators={processedData.orchestrators} selectedKPI={selectedKPI} />
            </section>
            <section className="map-section">
              <h3>Interactive World Map</h3>
              {/* Placeholder for Map Component */}
            </section>
            <section className="histogram-section">
              <h3>Discovery Time Histogram</h3>
              {/* Placeholder for Histogram Component */}
            </section>
          </div>
        );
      case "performance":
        return (
          <div className="tab-content">
            <section className="ranking-section">
              <h3>Performance Ranking</h3>
              <RankingTable orchestrators={processedData.orchestrators} selectedKPI={selectedKPI} />
            </section>
            <section className="map-section">
              <h3>Interactive World Map</h3>
              {/* Placeholder for Map Component */}
            </section>
            <section className="histogram-section">
              <h3>Performance Histogram</h3>
              {/* Placeholder for Histogram Component */}
            </section>
          </div>
        );
      default:
        return null;
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
            className={`tab ${activeTab === "pricing" ? "active" : ""}`}
            onClick={() => setActiveTab("pricing")}
          >
            Pricing
          </button>
          <button
            className={`tab ${activeTab === "discovery-time" ? "active" : ""}`}
            onClick={() => setActiveTab("discovery-time")}
          >
            Discovery Time
          </button>
          <button
            className={`tab ${activeTab === "performance" ? "active" : ""}`}
            onClick={() => setActiveTab("performance")}
          >
            Performance
          </button>
        </div>
      </header>
      <div className="scrollable-content">{renderTabContent()}</div>
    </div>
  );
};

export default Home;
