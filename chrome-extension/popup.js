const BACKEND_URL = "http://localhost:8080/api";

document.addEventListener("DOMContentLoaded", async () => {
  // Elements
  const statusIndicator = document.getElementById("status-indicator");
  const statusText = document.getElementById("status-text");
  
  const statTotal = document.getElementById("stat-total");
  const statSafe = document.getElementById("stat-safe");
  const statOffensive = document.getElementById("stat-offensive");
  const statSpam = document.getElementById("stat-spam");
  
  const thresholdSlider = document.getElementById("threshold-slider");
  const thresholdVal = document.getElementById("threshold-val");
  
  const btnAnalyze = document.getElementById("btn-analyze");
  const btnInspect = document.getElementById("btn-inspect");
  const btnToggleView = document.getElementById("btn-toggle-view");
  const btnExport = document.getElementById("btn-export");
  
  const filterSelect = document.getElementById("filter-select");
  const historyList = document.getElementById("history-list");

  let backendConnected = false;

  // Initialize sensitivity threshold from storage
  chrome.storage.local.get(["threshold", "hideOffensive"], (data) => {
    if (data.threshold) {
      thresholdSlider.value = data.threshold * 100;
      thresholdVal.textContent = `${Math.round(data.threshold * 100)}%`;
    } else {
      chrome.storage.local.set({ threshold: 0.70 });
    }
    
    if (data.hideOffensive !== undefined) {
      updateToggleButtonUI(data.hideOffensive);
    } else {
      chrome.storage.local.set({ hideOffensive: false });
    }
  });

  // Handle slider changes
  thresholdSlider.addEventListener("input", (e) => {
    const val = e.target.value;
    thresholdVal.textContent = `${val}%`;
    const scoreVal = val / 100;
    chrome.storage.local.set({ threshold: scoreVal });
    
    // Broadcast threshold change to active tab's content script
    sendMessageToActiveTab({ action: "UPDATE_THRESHOLD", threshold: scoreVal });
  });

  // Check connection to Spring Boot backend
  async function checkBackendConnection() {
    try {
      const response = await fetch(`${BACKEND_URL}/statistics`);
      if (response.ok) {
        setConnected(true);
        const stats = await response.json();
        updateStatsUI(stats);
        loadHistory();
      } else {
        setConnected(false);
      }
    } catch (e) {
      setConnected(false);
    }
  }

  function setConnected(connected) {
    backendConnected = connected;
    if (connected) {
      statusIndicator.classList.add("connected");
      statusText.textContent = "Connected";
      btnAnalyze.disabled = false;
      btnInspect.disabled = false;
      btnExport.disabled = false;
    } else {
      statusIndicator.classList.remove("connected");
      statusText.textContent = "Backend Offline";
      btnAnalyze.disabled = true;
      btnInspect.disabled = true;
      btnExport.disabled = true;
      showOfflineState();
    }
  }

  function updateStatsUI(stats) {
    statTotal.textContent = stats.totalScanned || 0;
    statSafe.textContent = stats.safeCount || 0;
    statOffensive.textContent = stats.offensiveCount || 0;
    statSpam.textContent = stats.spamCount || 0;
  }

  function showOfflineState() {
    statTotal.textContent = "-";
    statSafe.textContent = "-";
    statOffensive.textContent = "-";
    statSpam.textContent = "-";
    
    historyList.innerHTML = `
      <div class="empty-state">
        <p style="color: #ef4444; font-weight: 500;">Connection Error</p>
        <p class="sub">Could not connect to Spring Boot backend at http://localhost:8080. Start the backend app and refresh.</p>
      </div>
    `;
  }

  // Load comment history from DB
  async function loadHistory() {
    if (!backendConnected) return;
    try {
      const response = await fetch(`${BACKEND_URL}/history`);
      if (response.ok) {
        const history = await response.json();
        renderHistoryList(history);
      }
    } catch (e) {
      console.error("Error fetching history:", e);
    }
  }

  function renderHistoryList(items) {
    const filter = filterSelect.value;
    const filteredItems = items.filter(item => {
      if (filter === "ALL") return true;
      return item.label.toUpperCase() === filter;
    });

    if (filteredItems.length === 0) {
      historyList.innerHTML = `
        <div class="empty-state">
          <p>No comments found</p>
          <p class="sub">Change filter or scan new comments on pages.</p>
        </div>
      `;
      return;
    }

    historyList.innerHTML = "";
    filteredItems.forEach(item => {
      const itemEl = document.createElement("div");
      itemEl.className = `comment-item ${item.label.toLowerCase()}`;
      
      const labelBadge = item.label;
      const scorePercentage = Math.round(item.score * 100);

      itemEl.innerHTML = `
        <button class="btn-delete" data-id="${item.id}" title="Delete scan record">✕</button>
        <div class="comment-meta">
          <span class="meta-label">${labelBadge}</span>
          <span>Score: ${scorePercentage}%</span>
        </div>
        <p class="comment-text">${escapeHtml(item.text)}</p>
        <p class="comment-reason">${escapeHtml(item.reason)}</p>
      `;

      // Wire delete button
      itemEl.querySelector(".btn-delete").addEventListener("click", async (e) => {
        const id = e.target.getAttribute("data-id");
        e.stopPropagation();
        await deleteHistoryItem(id);
      });

      historyList.appendChild(itemEl);
    });
  }

  async function deleteHistoryItem(id) {
    try {
      const response = await fetch(`${BACKEND_URL}/history/${id}`, {
        method: "DELETE"
      });
      if (response.ok) {
        checkBackendConnection(); // Refresh stats and history list
      }
    } catch (e) {
      console.error("Error deleting comment:", e);
    }
  }

  // Filter dropdown listener
  filterSelect.addEventListener("change", () => {
    loadHistory();
  });

  // Action: Analyze Page
  btnAnalyze.addEventListener("click", () => {
    chrome.storage.local.get(["threshold"], (data) => {
      const threshold = data.threshold || 0.70;
      sendMessageToActiveTab({ action: "ANALYZE_PAGE", threshold: threshold });
      
      // Briefly show loading state on button
      const oldText = btnAnalyze.innerHTML;
      btnAnalyze.disabled = true;
      btnAnalyze.innerHTML = `<span class="btn-icon">⏳</span> Analyzing page...`;
      setTimeout(() => {
        btnAnalyze.disabled = false;
        btnAnalyze.innerHTML = oldText;
        checkBackendConnection(); // Refresh UI
      }, 3000);
    });
  });

  // Action: Inspector / Element Picker
  btnInspect.addEventListener("click", () => {
    sendMessageToActiveTab({ action: "START_INSPECTOR" });
    window.close(); // Close extension popup to let user click on page
  });

  // Action: Toggle visibility
  btnToggleView.addEventListener("click", () => {
    chrome.storage.local.get(["hideOffensive"], (data) => {
      const currentVal = !!data.hideOffensive;
      const newVal = !currentVal;
      chrome.storage.local.set({ hideOffensive: newVal }, () => {
        updateToggleButtonUI(newVal);
        sendMessageToActiveTab({ action: "TOGGLE_VISIBILITY", hide: newVal });
      });
    });
  });

  function updateToggleButtonUI(hide) {
    if (hide) {
      btnToggleView.innerHTML = `<span class="btn-icon">👁️</span> Show Flagged Comments`;
      btnToggleView.classList.add("active");
    } else {
      btnToggleView.innerHTML = `<span class="btn-icon">👁️</span> Hide Flagged Comments`;
      btnToggleView.classList.remove("active");
    }
  }

  // Action: Export CSV
  btnExport.addEventListener("click", async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/history`);
      if (!response.ok) return;
      
      const history = await response.json();
      if (history.length === 0) {
        alert("No scan data available to export!");
        return;
      }

      // Generate CSV
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "ID,Website,Comment Text,Label,Toxicity Score,Insult Score,Threat Score,Hate Score,Spam Score,Explanation\n";
      
      history.forEach(item => {
        const textEscaped = `"${item.text.replace(/"/g, '""')}"`;
        const reasonEscaped = `"${item.reason.replace(/"/g, '""')}"`;
        const row = [
          item.id,
          "Page Scan",
          textEscaped,
          item.label,
          item.toxicity,
          item.insult,
          item.threat,
          item.hate,
          item.spam,
          reasonEscaped
        ].join(",");
        csvContent += row + "\n";
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `comment_offense_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Export failed", e);
    }
  });

  // Message sender helper
  function sendMessageToActiveTab(msg) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, msg, (response) => {
          // Suppress errors for pages where content script isn't loaded
          if (chrome.runtime.lastError) {
            console.log("Could not communicate with tab. Make sure content script is active.");
          }
        });
      }
    });
  }

  function escapeHtml(text) {
    if (!text) return "";
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Initial and periodic checks
  checkBackendConnection();
  setInterval(checkBackendConnection, 3000);
});
