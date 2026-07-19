const BACKEND_URL = "http://localhost:8080/api";

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ANALYZE_BATCH") {
    // Proxy request to local Spring Boot API to avoid CORS issues
    fetch(`${BACKEND_URL}/analyze/batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        texts: message.texts,
        website: message.website
      })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error("HTTP error " + response.status);
        }
        return response.json();
      })
      .then(data => sendResponse({ success: true, data: data }))
      .catch(err => {
        console.error("Background fetch failed:", err);
        sendResponse({ success: false, error: err.message });
      });

    return true; // Keep message channel open for async response
  }
});
