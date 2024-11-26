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
      const leaderboardResults = orchestratorData.leaderboardResults || {};
      const instances = Object.entries(orchestratorData.instances || {}).map(
        ([instanceId, instanceData]) => {
          const probedFrom = Object.keys(instanceData.probedFrom || {});
          const regions = Object.keys(instanceData.regions || {});
          const livepeerRegions = Object.keys(instanceData.livepeer_regions || {});

          const lastPing = Object.values(instanceData.probedFrom || {}).reduce(
            (max, regionData) => Math.max(max, regionData.lastTime || 0),
            0
          );

          const avgRTR = livepeerRegions.reduce((sum, region) => {
            const leaderboard = leaderboardResults[region];
            return leaderboard ? sum + (leaderboard.latestRTR || 0) : sum;
          }, 0) / (livepeerRegions.length || 1);

          const avgSR = livepeerRegions.reduce((sum, region) => {
            const leaderboard = leaderboardResults[region];
            return leaderboard ? sum + (leaderboard.latestSR || 0) : sum;
          }, 0) / (livepeerRegions.length || 1);

          const bestDiscoveryTime = Object.values(orchestratorData.regionalStats || {})
            .map((stats) => stats.avgDiscoveryTime || Infinity)
            .reduce((best, current) => Math.min(best, current), Infinity);

          return {
            id: instanceId,
            price: instanceData.price || 0,
            latitude: instanceData.latitude || null,
            longitude: instanceData.longitude || null,
            probedFrom,
            regions,
            livepeer_regions: livepeerRegions,
            lastPing: lastPing || null,
            bestDiscoveryTime: bestDiscoveryTime === Infinity ? null : bestDiscoveryTime,
            avgRTR: avgRTR || 0,
            avgSR: avgSR || 0,
          };
        }
      );

      const avgPrice =
        instances.reduce((sum, inst) => sum + inst.price, 0) / (instances.length || 1);

      const avgDiscoveryTime = Object.values(orchestratorData.regionalStats || {})
        .map((stats) => stats.avgDiscoveryTime || Infinity)
        .reduce((best, current) => Math.min(best, current), Infinity);

      const avgRTR =
        Object.values(leaderboardResults).reduce((sum, metrics) => sum + (metrics.latestRTR || 0), 0) /
        (Object.keys(leaderboardResults).length || 1);

      const avgSR =
        Object.values(leaderboardResults).reduce((sum, metrics) => sum + (metrics.latestSR || 0), 0) /
        (Object.keys(leaderboardResults).length || 1);

      // Store regional stats for avgPrice and avgDiscoveryTime
      const bestPriceByRegion = {};
      const bestDiscoveryTimeByRegion = {};
      instances.forEach((instance) => {
        instance.probedFrom.forEach((region) => {
          if (!bestPriceByRegion[region]) {
            bestPriceByRegion[region] = instance.price || Infinity;
          } else if (instance.price && instance.price > 0.0 && bestPriceByRegion[region] > instance.price) {
            bestPriceByRegion[region] = instance.price;
          }
          if (!bestDiscoveryTimeByRegion[region]) {
            bestDiscoveryTimeByRegion[region] = orchestratorData.regionalStats[region].avgDiscoveryTime || Infinity;
          } else if (
            orchestratorData.regionalStats[region].avgDiscoveryTime &&
            orchestratorData.regionalStats[region].avgDiscoveryTime > 0.0 &&
            bestDiscoveryTimeByRegion[region] > orchestratorData.regionalStats[region].avgDiscoveryTime
          ) {
            bestDiscoveryTimeByRegion[region] = orchestratorData.regionalStats[region].avgDiscoveryTime;
          }
        });
      });
      // Store avgRTR per livepeer region
      const bestRTRByRegion = {};
      Object.entries(leaderboardResults).map(([region, leaderboard]) => {
        if (!bestRTRByRegion[region]) {
          bestRTRByRegion[region] = leaderboard.latestRTR || Infinity;
        } else if (leaderboard.latestRTR && leaderboard.latestRTR > 0.0 && bestRTRByRegion[region] > leaderboard.latestRTR) {
          bestRTRByRegion[region] = leaderboard.latestRTR;
        }
      });

      return {
        id: orchestratorId,
        name: orchestratorData.name,
        avgPrice: avgPrice || 0,
        avgDiscoveryTime: avgDiscoveryTime === Infinity ? null : avgDiscoveryTime,
        avgRTR: avgRTR || 0,
        avgSR: avgSR || 0,
        instances,
        bestPriceByRegion,
        bestDiscoveryTimeByRegion,
        bestRTRByRegion,
      };
    });

    // Calculate average values for normalization across orchestrators
    const allDiscoveryTimes = orchestrators.map((orchestrator) => orchestrator.avgDiscoveryTime).filter((time) => time !== null);
    const allPrices = orchestrators.map((orchestrator) => orchestrator.avgPrice).filter((price) => price !== null);
    const allRTR = orchestrators.map((orchestrator) => orchestrator.avgRTR).filter((rtr) => rtr !== null);

    const minDiscoveryTime = Math.min(...allDiscoveryTimes);
    const maxDiscoveryTime = Math.max(...allDiscoveryTimes);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const minRTR = Math.min(...allRTR);
    const maxRTR = Math.max(...allRTR);

    orchestrators.forEach((orchestrator) => {
      orchestrator.normalizedDiscoveryTime =
        orchestrator.avgDiscoveryTime !== null
          ? 1 - (orchestrator.avgDiscoveryTime - minDiscoveryTime) / (maxDiscoveryTime - minDiscoveryTime)
          : null;

      orchestrator.normalizedPrice =
        orchestrator.avgPrice !== null
          ? 1 - (orchestrator.avgPrice - minPrice) / (maxPrice - minPrice)
          : null;

      orchestrator.normalizedRTR =
        orchestrator.avgRTR !== null
          ? 1 - (orchestrator.avgRTR - minRTR) / (maxRTR - minRTR)
          : null;
    });

    // Calculate average values for normalization across instances
    const allInstances = orchestrators.flatMap((orchestrator) => orchestrator.instances);
    const allInstanceDiscoveryTimes = allInstances.map((inst) => inst.bestDiscoveryTime).filter((time) => time !== null && time >= 0.0);
    const allInstancePrices = allInstances.map((inst) => inst.price).filter((price) => price !== null && price >= 0.0);
    const allInstanceRTR = allInstances.map((inst) => inst.avgRTR).filter((rtr) => rtr !== null && rtr >= 0.0);

    const minInstanceDiscoveryTime = Math.min(...allInstanceDiscoveryTimes);
    const maxInstanceDiscoveryTime = Math.max(...allInstanceDiscoveryTimes);
    const minInstancePrice = Math.min(...allInstancePrices);
    const maxInstancePrice = Math.max(...allInstancePrices);
    const minInstanceRTR = Math.min(...allInstanceRTR);
    const maxInstanceRTR = Math.max(...allInstanceRTR);

    allInstances.forEach((instance) => {
      instance.normalizedDiscoveryTime =
        instance.bestDiscoveryTime !== null
          ? 1 - (instance.bestDiscoveryTime - minInstanceDiscoveryTime) / (maxInstanceDiscoveryTime - minInstanceDiscoveryTime)
          : null;

      instance.normalizedPrice =
        instance.price !== null
          ? 1 - (instance.price - minInstancePrice) / (maxInstancePrice - minInstancePrice)
          : null;

      instance.normalizedRTR =
        instance.avgRTR !== null
          ? 1 - (instance.avgRTR - minInstanceRTR) / (maxInstanceRTR - minInstanceRTR)
          : null;
    });

    // Process per-region stats
    Object.entries(apiData).forEach(([orchestratorId, orchestratorData]) => {
      Object.entries(orchestratorData.regionalStats || {}).forEach(([region, stats]) => {
        if (!perRegionStats[region]) {
          perRegionStats[region] = { totalAvgTime: 0, totalPrice: 0, count: 0 };
        }

        perRegionStats[region].totalAvgTime += stats.avgDiscoveryTime || 0;

        const instancePrices = Object.values(orchestratorData.instances || {}).map(
          (instance) => instance.price || 0
        );
        perRegionStats[region].totalPrice += instancePrices.reduce((sum, price) => sum + price, 0);

        perRegionStats[region].count++;
      });
    });

    // Calculate global buckets and percentiles
    const priceBuckets = createBuckets(allInstancePrices, 10);
    const discoveryTimeBuckets = createBuckets(allInstanceDiscoveryTimes, 10);
    const performanceBucketsRTR = createBuckets(allInstanceRTR, 10);
    const performanceBucketsSR = createBuckets(orchestrators.map((orchestrator) => orchestrator.avgSR).filter((sr) => sr !== null), 10);

    const aggregates = {
      pricing: calculateAggregateStats(allInstancePrices),
      discoveryTime: calculateAggregateStats(allInstanceDiscoveryTimes),
      performanceRTR: calculateAggregateStats(allInstanceRTR),
      performanceSR: calculateAggregateStats(orchestrators.map((orchestrator) => orchestrator.avgSR).filter((sr) => sr !== null)),
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
