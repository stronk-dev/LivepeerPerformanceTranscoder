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
    console.log("Processing: populating orchestrator instances...");

    const perRegionStats = {};
    const orchestrators = Object.entries(apiData).map(([orchestratorId, orchestratorData]) => {
      const leaderboardResults = orchestratorData.leaderboardResults || {};

      // Filter instances by valid latitude, longitude, and price
      const instances = Object.entries(orchestratorData.instances || {})
        .map(([instanceId, instanceData]) => {
          const probedFrom = Object.keys(instanceData.probedFrom || {});
          const regions = Object.keys(instanceData.regions || {});
          const livepeerRegions = Object.keys(instanceData.livepeer_regions || {});

          const lastPing = Object.values(instanceData.probedFrom || {}).reduce(
            (max, regionData) => Math.max(max, regionData.lastTime || 0),
            0
          );

          const validLivepeerRegionsForRTR = livepeerRegions.filter((region) =>
            leaderboardResults[region]?.latestRTR !== undefined &&
            leaderboardResults[region]?.latestRTR !== Infinity &&
            leaderboardResults[region].latestRTR > 0
          );

          const avgRTR =
            validLivepeerRegionsForRTR.reduce((sum, region) => {
              return sum + leaderboardResults[region].latestRTR;
            }, 0) / (validLivepeerRegionsForRTR.length || 1);

          const avgSR = validLivepeerRegionsForRTR.reduce((sum, region) => {
            return sum + (leaderboardResults[region]?.latestSR || 0);
          }, 0) / (validLivepeerRegionsForRTR.length || 1);

          const validDiscoveryTimeRegions = probedFrom.filter((region) =>
            orchestratorData.regionalStats[region]?.avgDiscoveryTime !== undefined &&
            orchestratorData.regionalStats[region]?.avgDiscoveryTime !== Infinity &&
            orchestratorData.regionalStats[region].avgDiscoveryTime > 0
          );

          const bestDiscoveryTime = Object.values(validDiscoveryTimeRegions)
            .map((region) => orchestratorData.regionalStats[region]?.avgDiscoveryTime || Infinity)
            .reduce((best, current) => Math.min(best, current), Infinity);

          return {
            id: instanceId,
            price: instanceData.price >= 0 ? instanceData.price : Infinity,
            latitude: instanceData.latitude,
            longitude: instanceData.longitude,
            probedFrom,
            regions,
            livepeer_regions: livepeerRegions,
            lastPing: lastPing || null,
            bestDiscoveryTime,
            avgRTR: avgRTR ? avgRTR : Infinity,
            avgSR: avgSR,
          };
        })
        .filter(
          (instance) =>
            instance.latitude !== null &&
            instance.latitude !== -1 &&
            instance.longitude !== null &&
            instance.longitude !== -1
        );

      // Calculate orchestrator-level statistics
      const validInstancesForPrice = instances.filter((inst) => inst.price !== null && inst.price !== Infinity && inst.price >= 0);
      const avgPrice =
        validInstancesForPrice.length > 0
          ? validInstancesForPrice.reduce((sum, inst) => sum + inst.price, 0) / validInstancesForPrice.length
          : -1;

      const validInstancesForDiscovery = instances.filter((inst) => inst.bestDiscoveryTime !== null && inst.bestDiscoveryTime !== Infinity && inst.bestDiscoveryTime >= 0);
      const avgDiscoveryTime =
        validInstancesForDiscovery.length > 0
          ? validInstancesForDiscovery.reduce((sum, inst) => sum + inst.bestDiscoveryTime, 0) / validInstancesForDiscovery.length
          : Infinity;

      const validRTRValues = Object.values(leaderboardResults)
        .map((metrics) => metrics.latestRTR)
        .filter((rtr) => rtr !== undefined && rtr !== Infinity && rtr > 0);
      const avgRTR =
        validRTRValues.length > 0 ? validRTRValues.reduce((sum, rtr) => sum + rtr, 0) / validRTRValues.length : Infinity;

      const validSRValues = Object.values(leaderboardResults)
        .map((metrics) => metrics.latestSR)
        .filter((sr) => sr !== undefined);
      const avgSR =
        validSRValues.length > 0 ? validSRValues.reduce((sum, sr) => sum + sr, 0) / validSRValues.length : 0.0;

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
            bestDiscoveryTimeByRegion[region] = orchestratorData.regionalStats[region]?.avgDiscoveryTime || Infinity;
          } else if (
            orchestratorData.regionalStats[region]?.avgDiscoveryTime &&
            orchestratorData.regionalStats[region].avgDiscoveryTime > 0.0 &&
            bestDiscoveryTimeByRegion[region] > orchestratorData.regionalStats[region].avgDiscoveryTime
          ) {
            bestDiscoveryTimeByRegion[region] = orchestratorData.regionalStats[region].avgDiscoveryTime;
          }
        });
      });

      // Store avgRTR per livepeer region
      const bestRTRByRegion = {};
      Object.entries(leaderboardResults).forEach(([region, leaderboard]) => {
        if (!bestRTRByRegion[region]) {
          bestRTRByRegion[region] = leaderboard.latestRTR || Infinity;
        } else if (leaderboard.latestRTR && leaderboard.latestRTR > 0.0 && bestRTRByRegion[region] > leaderboard.latestRTR) {
          bestRTRByRegion[region] = leaderboard.latestRTR;
        }
      });

      return {
        id: orchestratorId,
        name: orchestratorData.name,
        avgPrice,
        avgDiscoveryTime,
        avgRTR,
        avgSR,
        instances,
        bestPriceByRegion,
        bestDiscoveryTimeByRegion,
        bestRTRByRegion,
      };
    });
    console.log("Processing: normalizing KPIs...");

    // Calculate average values for normalization across orchestrators
    const allDiscoveryTimes = orchestrators.map((orchestrator) => orchestrator.avgDiscoveryTime).filter((time) => time !== null && time !== Infinity && time > 0.0);
    const allPrices = orchestrators.map((orchestrator) => orchestrator.avgPrice).filter((price) => price !== null && price !== Infinity && price >= 0.0);
    const allRTR = orchestrators.map((orchestrator) => orchestrator.avgRTR).filter((rtr) => rtr !== null && rtr !== Infinity && rtr > 0.0);

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
    const allInstanceDiscoveryTimes = allInstances.map((inst) => inst.bestDiscoveryTime).filter((time) => time !== null && time !== Infinity && time > 0.0);
    const allInstancePrices = allInstances.map((inst) => inst.price).filter((price) => price !== null && price !== Infinity && price >= 0.0);
    const allInstanceRTR = allInstances.map((inst) => inst.avgRTR).filter((rtr) => rtr !== null && rtr !== Infinity && rtr > 0.0);

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

    console.log("Processing: calculating regionwide stats...");

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

    console.log("Processing: calculating buckets and percentiles...");

    // Calculate global buckets and percentiles
    const priceBuckets = createBuckets(allInstancePrices, 10);
    const discoveryTimeBuckets = createBuckets(allInstanceDiscoveryTimes, 10);
    const performanceBucketsRTR = createBuckets(allInstanceRTR, 10);

    const aggregates = {
      pricing: calculateAggregateStats(allInstancePrices),
      discoveryTime: calculateAggregateStats(allInstanceDiscoveryTimes),
      performanceRTR: calculateAggregateStats(allInstanceRTR),
      buckets: {
        pricing: priceBuckets,
        discoveryTime: discoveryTimeBuckets,
        performanceRTR: performanceBucketsRTR,
      },
    };

    return { orchestrators, perRegionStats, aggregates };
  }

  function createBuckets(data, bucketSize) {
    if (!Array.isArray(data) || data.length === 0) {
      // No valid data, return empty buckets with appropriate metadata
      return Array.from({ length: bucketSize }, (_, i) => ({
        range: [i * bucketSize, (i + 1) * bucketSize],
        count: 0,
      }));
    }

    // Proceed with the bucket creation logic if there is valid data
    const minValue = Math.min(...data);
    const maxValue = Math.max(...data);

    if (minValue === maxValue) {
      // If all values are the same, create a single bucket for the entire range
      return [
        {
          range: [minValue, maxValue],
          count: data.length,
        },
      ];
    }

    const bucketRange = (maxValue - minValue) / bucketSize;
    const buckets = Array.from({ length: bucketSize }, (_, i) => ({
      range: [minValue + i * bucketRange, minValue + (i + 1) * bucketRange],
      count: 0,
    }));

    data.forEach((value) => {
      if (value !== null && value !== undefined) {
        const bucketIndex = Math.min(
          Math.floor((value - minValue) / bucketRange),
          bucketSize - 1
        );
        buckets[bucketIndex].count += 1;
      }
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
    async function fetchAndProcessData() {
      setLoading(true);
      try {
        console.log("Retrieving API data...");
        const apiData = await getData();
        const processedData = preprocessApiData(apiData);
        console.log(processedData);
        setProcessedData(processedData);
      } catch (error) {
        console.error("Data processing failed", error);
        setError(true);
      }
      setLoading(false);
    }
    fetchAndProcessData();
  }, []);

  return { isLoading, isError, processedData };
};

export default useProcessedData;
