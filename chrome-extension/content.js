// Global states
let activeThreshold = 0.70;
let hideOffensive = false;
let isInspectorActive = false;
let globalTooltip = null;

// Selectors configuration
const SITE_CONFIGS = {
  youtube: {
    hostname: "youtube.com",
    containerSelector: "ytd-comment-thread-renderer",
    textSelector: "#content-text",
    badgeTarget: "#header-author, #author-text",
    getCommentText: (el) => {
      const textEl = el.querySelector("#content-text");
      return textEl ? textEl.innerText.trim() : "";
    }
  },
  reddit: {
    hostname: "reddit.com",
    containerSelector: "shreddit-comment, div.Comment",
    textSelector: "div[data-testid='comment'], div.md",
    badgeTarget: "span[data-testid='author-name'], div.Comment > div:first-child",
    getCommentText: (el) => {
      const textEl = el.querySelector("div[data-testid='comment'], div.md");
      return textEl ? textEl.innerText.trim() : "";
    }
  },
  twitter: {
    hostname: "x.com",
    containerSelector: "article[data-testid='tweet']",
    textSelector: "div[data-testid='tweetText']",
    badgeTarget: "div[data-testid='User-Name']",
    getCommentText: (el) => {
      const textEl = el.querySelector("div[data-testid='tweetText']");
      return textEl ? textEl.innerText.trim() : "";
    }
  }
};

// Initialize extension script
function init() {
  createTooltip();
  
  // Load configuration from local storage
  chrome.storage.local.get(["threshold", "hideOffensive"], (data) => {
    if (data.threshold !== undefined) activeThreshold = data.threshold;
    if (data.hideOffensive !== undefined) hideOffensive = data.hideOffensive;
  });

  // Setup observer for dynamic page changes (SPA loading)
  const observer = new MutationObserver(debounce(() => {
    if (!isInspectorActive) {
      autoScanComments();
    }
  }, 1000));

  observer.observe(document.body, { childList: true, subtree: true });
  
  // Run initial scan
  setTimeout(autoScanComments, 1000);
}

// Helper: Debounce function to prevent observer thrashing
function debounce(func, wait) {
  let timeout;
  return function() {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, arguments), wait);
  };
}

// Detect which site config applies
function getSiteConfig() {
  const host = window.location.hostname;
  if (host.includes("youtube.com")) return SITE_CONFIGS.youtube;
  if (host.includes("reddit.com")) return SITE_CONFIGS.reddit;
  if (host.includes("twitter.com") || host.includes("x.com")) return SITE_CONFIGS.twitter;
  return null;
}

// Auto-scan elements on load and scroll
function autoScanComments() {
  const config = getSiteConfig();
  if (!config) return;

  const containers = document.querySelectorAll(config.containerSelector);
  const unscanned = [];
  const elementMap = new Map();

  containers.forEach(container => {
    if (container.getAttribute("data-coa-analyzed") === "true") return;
    
    // Mark as checked to prevent duplicate scans
    container.setAttribute("data-coa-analyzed", "true");

    const text = config.getCommentText(container);
    if (text && text.length > 3) {
      unscanned.push(text);
      elementMap.set(text, container);
    }
  });

  if (unscanned.length > 0) {
    // Process comments in batches of 15
    const batchSize = 15;
    for (let i = 0; i < unscanned.length; i += batchSize) {
      const chunk = unscanned.slice(i, i + batchSize);
      analyzeBatch(chunk, elementMap, config);
    }
  }
}

// Send texts to background for analysis proxy
function analyzeBatch(texts, elementMap, config) {
  chrome.runtime.sendMessage({
    type: "ANALYZE_BATCH",
    texts: texts,
    website: window.location.hostname
  }, (response) => {
    if (chrome.runtime.lastError || !response || !response.success) {
      console.log("Analysis request failed. Make sure backend is running.");
      return;
    }

    const results = response.data.results;
    results.forEach(res => {
      const container = elementMap.get(res.text);
      if (container) {
        applyModerationStyles(container, res, config);
      }
    });
  });
}

// Apply visual highlights, badges, and toggle collapse based on safety labels
function applyModerationStyles(container, result, config) {
  const label = result.label; // Safe, Suspicious, Offensive, Spam
  const toxicity = result.toxicity;

  // Add base highlights
  container.classList.add("coa-highlight");
  container.classList.add(`coa-${label.toLowerCase()}`);
  
  // Save scores to element data attributes for tooltips
  container.setAttribute("data-coa-label", label);
  container.setAttribute("data-coa-score", result.score);
  container.setAttribute("data-coa-reason", result.reason);
  container.setAttribute("data-coa-toxicity", result.toxicity);
  container.setAttribute("data-coa-insult", result.insult);
  container.setAttribute("data-coa-threat", result.threat);
  container.setAttribute("data-coa-hate", result.hate);
  container.setAttribute("data-coa-spam", result.spam);

  // Inject Badge
  injectBadge(container, label, result.score, config);

  // Handle Collapsing/Hiding for Offensive comments
  if (label === "Offensive" || label === "Spam") {
    handleOffensiveDisplay(container);
  }
}

// Inject safety rating badge next to author profile name
function injectBadge(container, label, score, config) {
  const badgeTarget = container.querySelector(config.badgeTarget);
  if (!badgeTarget) return;

  // Prevent multiple badges
  if (container.querySelector(".coa-badge")) return;

  const badge = document.createElement("span");
  badge.className = `coa-badge coa-badge-${label.toLowerCase()}`;
  badge.textContent = `${label} (${Math.round(score * 100)}%)`;
  badge.title = "Hover for AI Offense Breakdown";

  // Position badge
  badgeTarget.appendChild(badge);

  // Wire hover tooltip listeners
  badge.addEventListener("mouseenter", (e) => showTooltip(e, container));
  badge.addEventListener("mouseleave", hideTooltip);
}

// Hide or blur toxic comments if user enabled hiding
function handleOffensiveDisplay(container) {
  if (!hideOffensive) return;

  // Check if placeholder already exists
  const nextEl = container.nextElementSibling;
  if (nextEl && nextEl.classList.contains("coa-hidden-placeholder")) return;

  // Blur comment
  container.classList.add("coa-hidden");

  // Create reveal placeholder
  const placeholder = document.createElement("div");
  placeholder.className = "coa-hidden-placeholder";
  placeholder.innerHTML = `
    <span>⚠️ Hidden offensive comment (${container.getAttribute("data-coa-label")}).</span>
    <button class="reveal-btn">Reveal</button>
  `;

  // Insert placeholder right after container
  container.parentNode.insertBefore(placeholder, container.nextSibling);

  // Wire reveal button click
  placeholder.querySelector(".reveal-btn").addEventListener("click", () => {
    container.classList.remove("coa-hidden");
    placeholder.remove();
  });
}

// Restore visibility of blurred comments
function restoreAllOffensiveDisplay() {
  document.querySelectorAll(".coa-highlight.coa-hidden").forEach(container => {
    container.classList.remove("coa-hidden");
  });
  document.querySelectorAll(".coa-hidden-placeholder").forEach(placeholder => {
    placeholder.remove();
  });
}

// Re-evaluate hiding across page elements
function toggleVisibilityAll(hide) {
  hideOffensive = hide;
  if (hide) {
    document.querySelectorAll(".coa-highlight").forEach(container => {
      const label = container.getAttribute("data-coa-label");
      if (label === "Offensive" || label === "Spam") {
        handleOffensiveDisplay(container);
      }
    });
  } else {
    restoreAllOffensiveDisplay();
  }
}

// --- Custom Floating Tooltip popover implementation ---

function createTooltip() {
  if (document.getElementById("coa-global-tooltip")) return;
  
  globalTooltip = document.createElement("div");
  globalTooltip.id = "coa-global-tooltip";
  globalTooltip.className = "coa-tooltip";
  document.body.appendChild(globalTooltip);
}

function showTooltip(event, container) {
  if (!globalTooltip) return;

  const label = container.getAttribute("data-coa-label");
  const score = Math.round(parseFloat(container.getAttribute("data-coa-score")) * 100);
  const reason = container.getAttribute("data-coa-reason");
  
  const tox = parseFloat(container.getAttribute("data-coa-toxicity"));
  const ins = parseFloat(container.getAttribute("data-coa-insult"));
  const thr = parseFloat(container.getAttribute("data-coa-threat"));
  const hat = parseFloat(container.getAttribute("data-coa-hate"));
  const spm = parseFloat(container.getAttribute("data-coa-spam"));

  let colorClass = `coa-${label.toLowerCase()}`;

  globalTooltip.innerHTML = `
    <div class="coa-tooltip-title">
      <span>AI moderation breakdown</span>
      <span class="coa-tooltip-score ${colorClass}">${label} (${score}%)</span>
    </div>
    <div class="coa-tooltip-reason">${reason}</div>
    
    <div class="coa-cat-row">
      <span class="coa-cat-label">Toxicity</span>
      <div class="coa-cat-bar-container">
        <div class="coa-cat-bar" style="width: ${tox*100}%; background-color: #ef4444;"></div>
      </div>
      <span class="coa-cat-val">${Math.round(tox*100)}%</span>
    </div>
    
    <div class="coa-cat-row">
      <span class="coa-cat-label">Insult</span>
      <div class="coa-cat-bar-container">
        <div class="coa-cat-bar" style="width: ${ins*100}%; background-color: #f59e0b;"></div>
      </div>
      <span class="coa-cat-val">${Math.round(ins*100)}%</span>
    </div>
    
    <div class="coa-cat-row">
      <span class="coa-cat-label">Threat</span>
      <div class="coa-cat-bar-container">
        <div class="coa-cat-bar" style="width: ${thr*100}%; background-color: #ef4444;"></div>
      </div>
      <span class="coa-cat-val">${Math.round(thr*100)}%</span>
    </div>
    
    <div class="coa-cat-row">
      <span class="coa-cat-label">Hate Speech</span>
      <div class="coa-cat-bar-container">
        <div class="coa-cat-bar" style="width: ${hat*100}%; background-color: #ec4899;"></div>
      </div>
      <span class="coa-cat-val">${Math.round(hat*100)}%</span>
    </div>

    <div class="coa-cat-row">
      <span class="coa-cat-label">Spam</span>
      <div class="coa-cat-bar-container">
        <div class="coa-cat-bar" style="width: ${spm*100}%; background-color: #8b5cf6;"></div>
      </div>
      <span class="coa-cat-val">${Math.round(spm*100)}%</span>
    </div>
  `;

  // Position tooltip relative to mouse
  const badgeRect = event.target.getBoundingClientRect();
  const tooltipWidth = 260;
  
  let top = window.scrollY + badgeRect.bottom + 8;
  let left = window.scrollX + badgeRect.left - (tooltipWidth / 2) + (badgeRect.width / 2);

  // Boundary check
  if (left < 10) left = 10;
  if (left + tooltipWidth > window.innerWidth) {
    left = window.innerWidth - tooltipWidth - 10;
  }

  globalTooltip.style.top = `${top}px`;
  globalTooltip.style.left = `${left}px`;
  globalTooltip.classList.add("coa-visible");
}

function hideTooltip() {
  if (globalTooltip) {
    globalTooltip.classList.remove("coa-visible");
  }
}

// --- Visual DOM Selector / Custom Inspector Mode ---

function startVisualInspector() {
  if (isInspectorActive) return;
  isInspectorActive = true;
  
  // Show a notification banner/floating prompt in the document body
  const banner = document.createElement("div");
  banner.id = "coa-inspector-banner";
  banner.style.cssText = `
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
    background: #a855f7; color: white; padding: 12px 24px; border-radius: 30px;
    z-index: 999999; font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px; font-weight: 600; box-shadow: 0 4px 15px rgba(168, 85, 247, 0.4);
    display: flex; gap: 16px; align-items: center; pointer-events: auto;
  `;
  banner.innerHTML = `
    <span>🔍 Hover & Click any comment container on the page to analyze</span>
    <button id="coa-inspect-cancel" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 4px 10px; border-radius: 12px; cursor: pointer; font-weight: 700;">Cancel</button>
  `;
  document.body.appendChild(banner);

  banner.querySelector("#coa-inspect-cancel").addEventListener("click", stopVisualInspector);

  // Attach mouse listeners
  document.addEventListener("mouseover", inspectorMouseOver, true);
  document.addEventListener("mouseout", inspectorMouseOut, true);
  document.addEventListener("click", inspectorClick, true);
}

function stopVisualInspector() {
  isInspectorActive = false;
  const banner = document.getElementById("coa-inspector-banner");
  if (banner) banner.remove();

  document.removeEventListener("mouseover", inspectorMouseOver, true);
  document.removeEventListener("mouseout", inspectorMouseOut, true);
  document.removeEventListener("click", inspectorClick, true);
}

function inspectorMouseOver(e) {
  // Ignore banner elements
  if (e.target.closest("#coa-inspector-banner") || e.target.closest("#coa-global-tooltip")) return;
  e.target.classList.add("coa-inspector-hover");
}

function inspectorMouseOut(e) {
  e.target.classList.remove("coa-inspector-hover");
}

function inspectorClick(e) {
  if (e.target.closest("#coa-inspector-banner") || e.target.closest("#coa-global-tooltip")) return;
  
  e.preventDefault();
  e.stopPropagation();

  const selectedElement = e.target;
  selectedElement.classList.remove("coa-inspector-hover");
  
  stopVisualInspector();

  // Deduce tag selector and classes to search for similar elements
  const tagName = selectedElement.tagName.toLowerCase();
  let classList = Array.from(selectedElement.classList).filter(c => !c.startsWith("coa-"));
  
  let selector = tagName;
  if (classList.length > 0) {
    selector += "." + classList.join(".");
  }

  // Scrape similar elements
  const siblingComments = document.querySelectorAll(selector);
  const unscanned = [];
  const elementMap = new Map();

  siblingComments.forEach(container => {
    if (container.getAttribute("data-coa-analyzed") === "true") return;
    container.setAttribute("data-coa-analyzed", "true");

    const text = container.innerText.trim();
    if (text && text.length > 3) {
      unscanned.push(text);
      elementMap.set(text, container);
    }
  });

  // Analyze found comments
  if (unscanned.length > 0) {
    const config = {
      badgeTarget: selector,
      // Generic badge injection - injects at the top of container
      inject: true
    };
    
    // Analyze using a custom batch
    chrome.runtime.sendMessage({
      type: "ANALYZE_BATCH",
      texts: unscanned,
      website: window.location.hostname
    }, (response) => {
      if (response && response.success) {
        response.data.results.forEach(res => {
          const container = elementMap.get(res.text);
          if (container) {
            container.classList.add("coa-highlight");
            container.classList.add(`coa-${res.label.toLowerCase()}`);
            container.setAttribute("data-coa-label", res.label);
            container.setAttribute("data-coa-score", res.score);
            container.setAttribute("data-coa-reason", res.reason);
            container.setAttribute("data-coa-toxicity", res.toxicity);
            container.setAttribute("data-coa-insult", res.insult);
            container.setAttribute("data-coa-threat", res.threat);
            container.setAttribute("data-coa-hate", res.hate);
            container.setAttribute("data-coa-spam", res.spam);

            // Generic badge injection inside custom elements
            if (!container.querySelector(".coa-badge")) {
              const badge = document.createElement("span");
              badge.className = `coa-badge coa-badge-${res.label.toLowerCase()}`;
              badge.textContent = `${res.label} (${Math.round(res.score * 100)}%)`;
              badge.style.display = "block";
              badge.style.width = "max-content";
              badge.style.marginTop = "4px";
              
              container.insertBefore(badge, container.firstChild);
              badge.addEventListener("mouseenter", (e) => showTooltip(e, container));
              badge.addEventListener("mouseleave", hideTooltip);
            }

            if (res.label === "Offensive" || res.label === "Spam") {
              handleOffensiveDisplay(container);
            }
          }
        });
      }
    });
  } else {
    alert("Could not find any suitable unscanned text elements in selection.");
  }
}

// --- Message Listener for Popups ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "ANALYZE_PAGE") {
    // Reset checked attributes to force re-scan if requested
    document.querySelectorAll(".coa-highlight").forEach(el => {
      el.classList.remove("coa-highlight", "coa-safe", "coa-suspicious", "coa-offensive", "coa-spam");
      el.removeAttribute("data-coa-analyzed");
      const badge = el.querySelector(".coa-badge");
      if (badge) badge.remove();
    });
    
    autoScanComments();
    sendResponse({ status: "Analysis initiated" });
  } 
  else if (message.action === "START_INSPECTOR") {
    startVisualInspector();
    sendResponse({ status: "Inspector active" });
  } 
  else if (message.action === "TOGGLE_VISIBILITY") {
    toggleVisibilityAll(message.hide);
    sendResponse({ status: "Visibility toggled" });
  } 
  else if (message.action === "UPDATE_THRESHOLD") {
    activeThreshold = message.threshold;
    sendResponse({ status: "Threshold updated" });
  }
});

// Run
init();
