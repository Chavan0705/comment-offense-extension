# Comment Offense Analyzer 🛡️

A comprehensive portfolio project combining **Chrome Extension development (Manifest V3), Java Spring Boot 3, Hibernate JPA, and MySQL** to build an AI-powered moderation tool. It automatically scrapes, analyzes, and flags offensive, abusive, toxic, or spam comments on platforms like **YouTube, Reddit, and X (Twitter)**, and offers a **Visual Element Picker** for compatibility with any blog or website.

---

## Key Features

1. **Auto Comment Scraping**: Works natively with specialized DOM selectors on YouTube, X (Twitter), and Reddit.
2. **Visual DOM Inspector**: Click "Custom Element Picker" to select any custom text elements on *any* website to scrape and run analysis.
3. **AI & Heuristic Moderation**: Connects to the Hugging Face Inference API (`unitary/toxic-bert`) or the Gemini API for advanced NLP. If API credentials are not provided, it falls back to a built-in Java Lexical and Sentiment Engine so it works out-of-the-box.
4. **Visual Highlights & Overlays**: Flagged comments are color-coded (Red for Offensive, Yellow for Suspicious, Green for Safe, Purple for Spam) with rating badges and hover tooltips showing score breakdowns.
5. **Dashboard & Analytics**: Track scanning statistics in the extension popup. Includes filters, comment history controls, and a sensitivity threshold slider.
6. **Data Retention & Reports**: All scans are stored in a local MySQL database. Results can be deleted individually from the history panel or exported to a CSV report.

---

## Tech Stack

### Chrome Extension (Frontend)
* HTML, CSS, JavaScript (Manifest V3)
* Google Fonts (`Outfit` and `Inter`)
* Custom floating popovers, dynamic sliders, and hover overlays.

### Backend Services
* **Java 21** & **Spring Boot 3**
* **MySQL** (Relational Database)
* **Spring Data JPA & Hibernate** (ORM)
* **Maven** (Build Tool)

---

## Folder Structure

```text
comment-offense-analyzer/
│
├── database/
│   └── schema.sql                # SQL database table definitions
│
├── chrome-extension/
│   ├── manifest.json             # Manifest V3 extension configuration
│   ├── popup.html                # Premium dashboard HTML layout
│   ├── styles.css                # Glassmorphic dark UI styling
│   ├── popup.js                  # Frontend dashboard controller
│   ├── background.js             # Background API request proxy (avoids CORS)
│   ├── content.js                # Web scraper and tooltip injector script
│   ├── content.css               # Page highlights and tooltips CSS
│   └── icons/                    # Standard extension icons (16, 48, 128)
│
├── backend/
│   ├── pom.xml                   # Maven dependencies and build plugins
│   ├── src/
│   │   ├── main/
│   │   │   ├── resources/
│   │   │   │   └── application.properties   # App configurations & MySQL/AI keys
│   │   │   └── java/
│   │   │       └── com/portfolio/commentoffense/
│   │   │           ├── CommentOffenseApplication.java # Spring application entry point
│   │   │           ├── model/
│   │   │           │   └── Comment.java     # JPA database entity
│   │   │           ├── repository/
│   │   │           │   └── CommentRepository.java # JPA Repository operations
│   │   │           ├── dto/                 # Data Transfer Objects (REST payloads)
│   │   │           ├── service/
│   │   │           │   └── AnalysisService.java # Moderation logic (APIs & fallback)
│   │   │           └── controller/
│   │   │               └── AnalysisController.java # REST Endpoint controllers
│   │   └── test/                 # JUnit & Mockito controller unit tests
│   │
│   └── mvnw                      # Maven wrapper script
│
└── README.md
```

---

## Prerequisites

Ensure you have the following installed on your development machine:
1. **Java Development Kit (JDK) 21**
2. **Maven 3.8+**
3. **MySQL Server** (running on `localhost:3306`)
4. **Google Chrome** browser

---

## Getting Started

### 1. Database Setup
1. Ensure your local MySQL server is running.
2. The Spring Boot application is configured to connect to `localhost:3306` with username `root` and password `root`, and it will automatically create the database `comment_offense_db` on startup.
3. If your MySQL credentials differ, open `backend/src/main/resources/application.properties` and update the settings:
   ```properties
   spring.datasource.username=YOUR_MYSQL_USERNAME
   spring.datasource.password=YOUR_MYSQL_PASSWORD
   ```

### 2. Run the Spring Boot Backend
1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Build and run the project using Maven:
   * **Windows (PowerShell)**:
     ```powershell
     ./mvnw spring-boot:run
     ```
   * **Mac/Linux**:
     ```bash
     chmod +x mvnw
     ./mvnw spring-boot:run
     ```
3. The server will start on port `8080`. To check if it is active, visit `http://localhost:8080/api/statistics` in your browser.

*(Optional)*: If you want to use Hugging Face or Gemini, add your tokens/keys to the `application.properties` file.

### 3. Load the Chrome Extension
1. Open Google Chrome.
2. In the URL bar, go to `chrome://extensions/`.
3. Enable **Developer mode** using the toggle switch in the top right.
4. Click **Load unpacked** in the top left.
5. Select the `chrome-extension` directory inside this project folder.
6. The extension is now loaded! Pin the **Comment Offense Analyzer** to your toolbar for easy access.

---

## Verification and Testing

### Run Automated Backend Tests
To verify that the Spring Boot REST endpoints, service routing, and DTO structures are operating correctly, run the JUnit unit tests:
```bash
cd backend
./mvnw test
```

### Manual Usage Guide
1. Open a page with comment sections, such as a **YouTube** video, a thread on **Reddit**, or a tweet on **X (Twitter)**.
2. Click the extension icon in your toolbar. You should see a **Green status light (Connected)**.
3. Click **Analyze Page Comments**. The comments on the page will automatically highlight.
4. Hover over the color-coded ratings badge (e.g. `OFFENSIVE 92%`) to see the detail breakdown card.
5. Click **Hide Offensive Comments** to blur flagged comments and replace them with a "Reveal" button.
6. Click **Custom Element Picker** to select a custom paragraph or div container on any other website to scan comments.
7. Open the extension popup to view today's statistics, filter history, delete records, or download a **CSV report**.
