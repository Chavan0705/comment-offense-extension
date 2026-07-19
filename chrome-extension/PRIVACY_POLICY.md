# Privacy Policy - Comment Offense Analyzer

*Effective Date: July 20, 2026*

This Privacy Policy explains how the **Comment Offense Analyzer** ("we", "our", or "the Extension") collects, uses, processes, and protects your information when you install and use our Chrome Extension.

---

## 1. Information Collection and Transmission

The Extension is designed to analyze comment text on social media platforms (such as YouTube, Reddit, and X/Twitter) to detect offensive language. 

* **Scraped Comment Text**: When you click "Analyze Page Comments" or use the "Custom Element Picker", the Extension automatically extracts the text of comments currently visible in your active browser tab.
* **Metadata**: We collect the source website hostname (e.g., `youtube.com` or `reddit.com`) to associate comments with their platform.
* **No PII Collection**: The Extension does **not** collect or transmit personally identifiable information (PII) such as your real name, email address, browser history, IP address, or Google account details.

---

## 2. Information Processing and Storage

All comment text extracted by the content script is processed as follows:

1. **Backend Server API**: The text is sent securely via HTTP/HTTPS to the configured backend API (e.g., `http://localhost:8080` or your deployed API URL) for analysis.
2. **AI Inference Services**: If configured to use third-party APIs (such as Hugging Face or Gemini API), the comment text is transmitted to those respective services to compute toxicity scores. These requests are governed by the privacy policies of Hugging Face and Google Gemini.
3. **Database Storage**: The analyzed comment text, classification label (Safe, Offensive, Suspicious, Spam), confidence score, category metrics, and timestamp are saved in the backend relational database (MySQL or H2).

---

## 3. Data Control and Deletion

You have complete control over the history of analyzed comments:
* **Local Controls**: You can view the list of previously analyzed comments inside the Extension popup.
* **Deletion**: You can delete individual scan records by clicking the "✕" button next to any item in the history list. Deleting an item removes it permanently from the database.

---

## 4. Changes to This Policy

We may update this Privacy Policy from time to time to reflect changes in our data practices or regulatory requirements. We will update the "Effective Date" at the top of this document accordingly.

---

## 5. Contact Us

If you have any questions or feedback regarding this Privacy Policy or the security of your data, please open an issue in the project's source repository.
