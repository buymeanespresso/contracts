// Script to check connection to the Espresso Network API
import axios from "axios";

// Espresso Network API endpoints
const ESPRESSO_ENDPOINTS = {
  query: "http://34.31.168.162:8770/v0",
  stateRelay: "http://34.31.168.162:8770/v0",
  submit: "http://34.31.168.162:8770/v0"
};

async function main() {
  console.log("Checking connection to Espresso Network API...");
  console.log("Endpoints:", ESPRESSO_ENDPOINTS);

  try {
    // Check status API
    console.log("\nTesting status API...");
    const statusResponse = await axios.get(`${ESPRESSO_ENDPOINTS.query}/status/metrics`);
    console.log("Status API Response:", statusResponse.status === 200 ? "✅ Connected" : "❌ Failed");
    
    // Check submit API
    console.log("\nTesting submit API...");
    try {
      const submitResponse = await axios.get(`${ESPRESSO_ENDPOINTS.submit}/submit`);
      console.log("Submit API Response:", submitResponse.status === 200 ? "✅ Connected" : "❌ Failed");
    } catch (error: any) {
      // Even a 404 or method not allowed error means we can reach the API
      if (error.response) {
        console.log("Submit API Response:", "✅ Connected (received error response)");
        console.log("Status:", error.response.status);
        console.log("Data:", error.response.data?.substring(0, 200) + "..."); // Truncate output
      } else {
        console.log("Submit API Response:", "❌ Failed (no response)");
        console.log("Error:", error.message);
      }
    }

    // Try to get the root API path to see what's available
    console.log("\nQuerying root API path...");
    try {
      const rootResponse = await axios.get(`${ESPRESSO_ENDPOINTS.query.split("/v0")[0]}`);
      console.log("Root API Response:", rootResponse.status === 200 ? "✅ Connected" : "❌ Failed");
      console.log("Data:", rootResponse.data?.substring(0, 200) + "..."); // Truncate output
    } catch (error: any) {
      if (error.response) {
        console.log("Root API Response:", "✅ Connected (received error response)");
        console.log("Status:", error.response.status);
        console.log("Data:", error.response.data?.substring(0, 200) + "..."); // Truncate output
      } else {
        console.log("Root API Response:", "❌ Failed (no response)");
        console.log("Error:", error.message);
      }
    }

    console.log("\nAPI connection test complete!");
  } catch (error: any) {
    console.error("Error connecting to Espresso Network API:", error.message);
    if (error.response) {
      console.log("Status:", error.response.status);
      console.log("Data:", error.response.data);
    }
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exitCode = 1;
}); 