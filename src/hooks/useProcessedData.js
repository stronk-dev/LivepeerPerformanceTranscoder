import { useState, useEffect } from "react";
import { getData } from "../util/api";

const useProcessedData = () => {
  const [isLoading, setLoading] = useState(true);
  const [isError, setError] = useState(false);
  const [processedData, setProcessedData] = useState(null);

  function preprocessApiData(apiData) {
    if (!apiData || typeof apiData !== 'object') {
      throw new Error('Invalid API data: Ensure data is correctly fetched and parsed.');
    }

    const perRegionStats = {};

    const orchestrators = Object.entries(apiData).map(([orchestratorId, orchestratorData]) => {
      const instances = Object.entries(orchestratorData.instances || {}).map(
        ([instanceId, instanceData]) => {
          // Extract probedFrom, regions, and livepeer_regions
          const probedFrom = Object.keys(instanceData.probedFrom || {});
          const regions = Object.keys(instanceData.regions || {});
          const livepeerRegions = Object.keys(instanceData.livepeer_regions || {});

          // Calculate lastPing as the maximum lastTime in probedFrom
          const lastPing = Object.values(instanceData.probedFrom || {}).reduce(
            (max, regionData) => Math.max(max, regionData.lastTime || 0),
            0
          );

          // Calculate avgPerformance metrics (latestRTR, latestSR) by mapping livepeer_regions to leaderboardResults
          let totalRTR = 0;
          let totalSR = 0;
          let performanceCount = 0;

          livepeerRegions.forEach((region) => {
            const leaderboard = orchestratorData.leaderboardResults?.[region];
            if (leaderboard) {
              totalRTR += leaderboard.latestRTR || 0;
              totalSR += leaderboard.latestSR || 0;
              performanceCount++;
            }
          });

          const avgRTR = performanceCount > 0 ? totalRTR / performanceCount : null;
          const avgSR = performanceCount > 0 ? totalSR / performanceCount : null;

          return {
            id: instanceId,
            price: instanceData.price || 0,
            latitude: instanceData.latitude || null,
            longitude: instanceData.longitude || null,
            probedFrom,
            regions,
            livepeer_regions: livepeerRegions,
            lastPing: lastPing || null,
            bestDiscoveryTime: Object.values(orchestratorData.regionalStats || {})
              .map((stats) => stats.avgDiscoveryTime || Infinity)
              .reduce((best, current) => Math.min(best, current), Infinity) || null,
            avgRTR,
            avgSR,
          };
        }
      );

      // Calculate orchestrator-level aggregates
      const avgPrice =
        instances.reduce((sum, inst) => sum + inst.price, 0) / (instances.length || 1);
      const avgRTR =
        instances.reduce((sum, inst) => sum + (inst.avgRTR || 0), 0) /
        (instances.filter((inst) => inst.avgRTR !== null).length || 1);
      const avgSR =
        instances.reduce((sum, inst) => sum + (inst.avgSR || 0), 0) /
        (instances.filter((inst) => inst.avgSR !== null).length || 1);

      const bestDiscoveryTime = instances.reduce(
        (best, inst) => Math.min(best, inst.bestDiscoveryTime || Infinity),
        Infinity
      );

      const validBestDiscoveryTime =
        bestDiscoveryTime === Infinity ? null : bestDiscoveryTime;

      return {
        id: orchestratorId,
        name: orchestratorData.name,
        avgPrice: avgPrice || null,
        avgRTR: avgRTR || null,
        avgSR: avgSR || null,
        bestDiscoveryTime: validBestDiscoveryTime,
        instances,
      };
    });

    // Process per-region stats
    Object.entries(apiData).forEach(([orchestratorId, orchestratorData]) => {
      Object.entries(orchestratorData.regionalStats || {}).forEach(([region, stats]) => {
        if (!perRegionStats[region]) {
          perRegionStats[region] = { totalAvgTime: 0, totalPrice: 0, count: 0 };
        }

        // Aggregate per-region stats
        perRegionStats[region].totalAvgTime += stats.avgDiscoveryTime || 0;

        const instancePrices = Object.values(orchestratorData.instances || {}).map(
          (instance) => instance.price || 0
        );
        perRegionStats[region].totalPrice += instancePrices.reduce((sum, price) => sum + price, 0);

        perRegionStats[region].count++;
      });
    });

    // Calculate global buckets and percentiles
    const allPrices = orchestrators
      .flatMap((orchestrator) => orchestrator.instances.map((inst) => inst.price))
      .filter((price) => price !== null);
    const allDiscoveryTimes = orchestrators
      .map((orchestrator) => orchestrator.bestDiscoveryTime)
      .filter((time) => time !== null);
    const allRTR = orchestrators
      .flatMap((orchestrator) => orchestrator.instances.map((inst) => inst.avgRTR))
      .filter((rtr) => rtr !== null);
    const allSR = orchestrators
      .flatMap((orchestrator) => orchestrator.instances.map((inst) => inst.avgSR))
      .filter((sr) => sr !== null);

    const priceBuckets = createBuckets(allPrices, 10);
    const discoveryTimeBuckets = createBuckets(allDiscoveryTimes, 10);
    const performanceBucketsRTR = createBuckets(allRTR, 10);
    const performanceBucketsSR = createBuckets(allSR, 10);

    const aggregates = {
      pricing: calculateAggregateStats(allPrices),
      discoveryTime: calculateAggregateStats(allDiscoveryTimes),
      performanceRTR: calculateAggregateStats(allRTR),
      performanceSR: calculateAggregateStats(allSR),
      buckets: {
        pricing: priceBuckets,
        discoveryTime: discoveryTimeBuckets,
        performanceRTR: performanceBucketsRTR,
        performanceSR: performanceBucketsSR,
      },
    };

    return { orchestrators, perRegionStats, aggregates };
  }

  // Utility to create histogram buckets
  function createBuckets(values, bucketCount) {
    if (!Array.isArray(values) || values.length === 0) {
      return Array.from({ length: bucketCount }, (_, i) => ({
        range: [0, 0],
        count: 0,
      }));
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const bucketSize = range > 0 ? range / bucketCount : 1;

    const buckets = Array.from({ length: bucketCount }, (_, i) => ({
      range: [min + i * bucketSize, min + (i + 1) * bucketSize],
      count: 0,
    }));

    values.forEach((value) => {
      const index = Math.min(
        bucketCount - 1,
        Math.floor((value - min) / bucketSize)
      );
      buckets[index].count++;
    });

    return buckets;
  }

  // Utility function to calculate aggregate statistics
  function calculateAggregateStats(values) {
    if (!values.length) return { median: null, percentiles: {}, range: null };
    const sorted = values.slice().sort((a, b) => a - b);
    const percentiles = {
      p25: sorted[Math.floor(sorted.length * 0.25)] || null,
      p50: calculateMedian(sorted),
      p75: sorted[Math.floor(sorted.length * 0.75)] || null,
    };
    return {
      median: percentiles.p50,
      percentiles,
      range: [Math.min(...values), Math.max(...values)],
    };
  }

  // Utility to calculate median
  function calculateMedian(arr) {
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 === 0
      ? (arr[mid - 1] + arr[mid]) / 2
      : arr[mid];
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getData();
        const preprocessed = preprocessApiData(data);
        console.log(preprocessed);
        setProcessedData(preprocessed);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return { isLoading, isError, processedData };
};

export default useProcessedData;
