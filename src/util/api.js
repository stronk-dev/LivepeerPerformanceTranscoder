
export const getData = async () => {
  try {
    const response = await fetch("https://stronk.rocks/orch/json");
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching regions:", error);
    throw error;
  }
};