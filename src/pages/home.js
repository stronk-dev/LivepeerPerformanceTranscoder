import React, { useRef, useState } from "react";
import DvdLogo from "../components/DvdLogo";
import LoadingScreen from "../components/loadingScreen";
import useProcessedData from "../hooks/useProcessedData";
import "./home.css";

const Home = () => {
  const rootContainerRef = useRef(null);
  const { isLoading, isError, processedData } = useProcessedData();

  const [activeTab, setActiveTab] = useState("pricing");

  const renderTabContent = () => {
    switch (activeTab) {
      case "pricing":
        return (
          <div className="tab-content">
            <section className="ranking-section">
              <h3>Ranking</h3>
              {/* Placeholder for Ranking Component */}
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
              <h3>Ranking</h3>
              {/* Placeholder for Ranking Component */}
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
              <h3>Ranking</h3>
              {/* Placeholder for Ranking Component */}
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
    <div ref={rootContainerRef}>
      <DvdLogo parentRef={rootContainerRef} />
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
      {renderTabContent()}
    </div>
  );
};

export default Home;
