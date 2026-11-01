# API Explorer & Monitoring Tool

A full-stack developer tool designed to test, proxy, monitor, and analyze REST API interactions against upstream microservices. Built with a **React + Vite** frontend and a **Java 17 / Spring Boot 3** backend (with SQLite persistence), engineered for edge-case resilience, security hardening, and observability.

---

## 🏗 Architecture Overview

```
┌─────────────────────────────────┐
│     React + Vite Frontend       │ (Port 5173)
│   Explorer • Tester • History   │
│         SQL Query Console       │
└────────────────┬────────────────┘
                 │ HTTP (JSON)
                 ▼
┌─────────────────────────────────┐
│   Spring Boot 3 Backend Server  │ (Port 3001)
│  Proxy Engine • Security Guards │
│   SQLite Persistence • Analytics│
└───────┬─────────────────┬───────┘
        │                 │
        │ Proxied Calls   │ SQLite Read/Write
        ▼                 ▼
┌──────────────┐   ┌──────────────┐
│  Upstream    │   │ SQLite DB    │
│  ShipIQ API  │   │ request_logs │
└──────────────┘   └──────────────┘
```

The system acts as an intelligent intermediary between developers and upstream services:
1. **Frontend** initiates requests through the internal proxy rather than calling third-party services directly.
2. **Backend Proxy** forwards requests to the upstream API while enforcing timeouts, validating targets, parsing payloads safely, and catching intermittent network/upstream failures.
3. **Telemetry & Audit Logger** stores every request, response, latency metric, and error classification into SQLite with automatic credential redaction.
4. **Interactive Interfaces** provide instant request inspection, aggregate statistical dashboards, and a secure SQL console for deep-dive analysis.

---

## ✨ Key Features

### 1. Robust Proxy Engine & Edge-Case Handling
Upstream mock and production APIs often present unpredictable behaviors: high latency, silent hangs, unexpected HTTP errors, or malformed JSON payloads. The proxy engine handles each gracefully:
- **Server-Side Timeout Cutoff:** Aborts upstream calls after **8 seconds** (preventing 20s+ thread hangs).
- **Safe JSON Parsing:** Reads raw text first and handles malformed JSON without crashing, categorizing it as `MALFORMED_JSON` while preserving the raw text for debugging.
- **Empty State Detection:** Identifies `200 OK` responses that return empty arrays or objects (`EMPTY_STATE`).
- **Memory Protection:** Caps stored response bodies at **1 MB** to prevent memory exhaustion on oversized payloads.
- **Standardized Error Categorization:** Classifies issues into `TIMEOUT`, `NETWORK_ERROR`, `MALFORMED_JSON`, `HTTP_ERROR`, or `EMPTY_STATE`.

### 2. Request History & Observability Dashboard
- **Telemetry Recording:** Logs HTTP method, URL, endpoint, redacted headers, query params, status codes, response time (ms), success flags, and error messages.
- **Filterable History:** Search requests by outcome (`success` / `failure`), HTTP method (`GET`, `POST`, etc.), or error type.
- **Summary Metrics (`/api/history/stats`):** Instant dashboard statistics including total requests, success/failure counts, and min/max/average response times.

### 3. Interactive SQL Query Console
- **Raw SQL Interface:** Execute custom SQL queries directly against the `request_logs` table.
- **Built-in Presets:** 9 pre-configured queries for one-click analysis (e.g., *All Failed Requests*, *Slow Requests > 2s*, *Timeout Breakdown*, *Status Code Distribution*).
- **Schema Explorer:** Dynamically inspects table columns and data types via SQLite pragmas.

### 4. Enterprise Security Controls
- **SSRF Prevention:**
  - Enforces paths starting with `/`.
  - Disallows path traversal characters (`..`, `//`, `\`, `?`, `#`).
  - Strict host pinning: guarantees all requests resolve exclusively to the target service (`shipiq-backend-service.onrender.com`).
  - Hop-by-hop and restricted headers (`Host`, `Content-Length`, `Transfer-Encoding`, etc.) are stripped.
- **SQL Injection & DoS Hardening:**
  - Queries are executed over a dedicated **read-only SQLite DataSource** (`SQLiteConfig.setReadOnly(true)`).
  - Multi-line regex with `(?si)` (DOTALL) prevents newline-based bypasses.
  - Comprehensive keyword blocklist: `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`, `TRUNCATE`, `REPLACE`, `ATTACH`, `DETACH`, `VACUUM`, `PRAGMA`, `EXEC`.
  - Query bounds: **5-second statement timeout** and a hard limit of **500 rows** (`setMaxRows`).
- **Data Protection & Sanitization:**
  - Sensitive headers (`Authorization`, `Cookie`, `Set-Cookie`, `X-Api-Key`, `X-Auth-Token`) are redacted as `[REDACTED]` prior to SQLite logging.
  - Internal database errors and stack traces are suppressed from client responses.
- **Loopback Binding:** Backend binds strictly to `127.0.0.1` by default to avoid unintended local network exposure.

---

## 📁 Repository Structure

```
internship/
├── client/                     # Frontend Application (React + Vite)
│   ├── src/
│   │   ├── api/client.js       # Centralized API client & HTTP helpers
│   │   ├── components/         # Reusable UI widgets (JsonViewer, ErrorBanner, etc.)
│   │   ├── pages/
│   │   │   ├── ApiTester.jsx   # Custom REST request builder & tester
│   │   │   ├── Explorer.jsx    # Endpoint discovery & documentation page
│   │   │   ├── History.jsx     # Logged requests table & aggregate metrics
│   │   │   └── QueryInterface.jsx # SQL console with presets & schema viewer
│   │   ├── App.jsx             # Main routing & application layout
│   │   └── main.jsx            # React root mount point
│   ├── package.json
│   └── vite.config.js
│
├── server-java/                # Primary Backend (Java 17 / Spring Boot 3.3.5)
│   ├── src/main/java/com/apiexplorer/
│   │   ├── ApiExplorerApplication.java # Spring Boot main entry
│   │   ├── config/             # CORS and Database (read-only datasource) configuration
│   │   ├── controller/         # REST Controllers (Proxy, History, Query, Health)
│   │   ├── model/              # DTOs (ProxyRequest, ProxyResponse, RequestLog)
│   │   ├── repository/         # Spring JDBC repository for SQLite
│   │   └── service/            # Core business logic (SSRF checks, HTTP client, query safety)
│   ├── src/main/resources/
│   │   ├── application.properties # Server port, binding, datasource settings
│   │   └── schema.sql          # SQLite DDL for request_logs table
│   ├── mvnw / mvnw.cmd         # Maven Wrapper scripts
│   └── pom.xml                 # Maven dependencies & build configuration
│
├── server/                     # Original Node.js Reference Implementation (Express)
│   ├── routes/                 # proxy.js, history.js, query.js
│   ├── db.js                   # better-sqlite3 initialization
│   ├── index.js                # Express app entry
│   └── package.json
│
├── .gitignore                  # Global repository gitignore
└── README.md                   # Comprehensive project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- **Java Development Kit (JDK):** Version 17 or higher (`java -version`)
- **Node.js:** Version 18.x or higher and `npm` (`node -v`)

---

### Step 1: Start the Java Backend

Open a terminal and navigate to `server-java/`:

```powershell
cd server-java
```

**Option A — Run with the Maven Wrapper:**
```powershell
.\mvnw.cmd spring-boot:run
```
*(On Linux/macOS: `./mvnw spring-boot:run`)*

**Option B — Build and Run the Packaged JAR:**
```powershell
.\mvnw.cmd package -DskipTests
java -jar target/api-explorer-server-1.0.0.jar
```

The backend starts at `http://127.0.0.1:3001`. On first run, it automatically initializes the SQLite schema in `api_explorer.db`.

---

### Step 2: Start the React Frontend

In a separate terminal, navigate to `client/`:

```powershell
cd client
npm install
npm run dev
```

The Vite dev server will start at `http://localhost:5173`. Open your browser and navigate to this URL.

---

### (Optional) Running the Legacy Node.js Server

If you wish to run the Node.js Express server instead of Java:

```powershell
cd server
npm install
npm run dev
```
Both backends are interface-compatible and bind to port `3001`.

---

## 📡 API Reference

### Health
- **`GET /api/health`**
  - Returns backend health, uptime (seconds), and current timestamp.

### Proxy Engine
- **`POST /api/proxy`**
  - Proxies an HTTP request to the upstream target and logs the interaction.
  - **Body Format:**
    ```json
    {
      "method": "GET",
      "path": "/logs",
      "queryParams": { "limit": 10 },
      "headers": { "Authorization": "Bearer token..." },
      "body": null
    }
    ```
  - **Response Format:**
    ```json
    {
      "status": 200,
      "data": [...],
      "responseTime": 342,
      "error": null,
      "errorType": null,
      "logId": 1,
      "success": true
    }
    ```

### Request History
- **`GET /api/history`**
  - Optional filters: `?status=success|failure`, `?method=GET|POST`, `?error_type=TIMEOUT`, `?limit=100`.
- **`GET /api/history/stats`**
  - Aggregated performance statistics (success/failure rates, response time averages, error distribution).
- **`GET /api/history/{id}`**
  - Detailed single log entry view by record ID.

### SQL Query Interface
- **`POST /api/query`**
  - Executes a read-only SELECT query against `request_logs`.
  - **Body:** `{ "sql": "SELECT id, method, response_time FROM request_logs WHERE is_success = 0" }`
- **`GET /api/query/presets`**
  - Returns predefined SQL queries for common debugging patterns.
- **`GET /api/query/schema`**
  - Returns table metadata and column types.

---

## 🗄 Database Schema (`request_logs`)

| Column Name | SQLite Type | Description |
|---|---|---|
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Unique identifier for each log record |
| `timestamp` | `TEXT NOT NULL` | ISO / UTC timestamp of execution |
| `method` | `TEXT NOT NULL` | HTTP Method (`GET`, `POST`, `PUT`, `DELETE`) |
| `url` | `TEXT NOT NULL` | Full target URL with query string |
| `endpoint` | `TEXT` | Target path (e.g. `/logs`) |
| `request_headers`| `TEXT` | JSON-serialized request headers (credentials redacted) |
| `request_body` | `TEXT` | JSON-serialized request body (for POST/PUT) |
| `query_params` | `TEXT` | JSON-serialized query parameters |
| `status_code` | `INTEGER` | HTTP response code (or `null` if connection failed) |
| `response_body` | `TEXT` | Captured response payload (capped at 1 MB) |
| `response_time` | `INTEGER` | Total elapsed duration in milliseconds |
| `is_success` | `INTEGER NOT NULL` | `1` for successful calls, `0` for errors |
| `error_type` | `TEXT` | `TIMEOUT`, `NETWORK_ERROR`, `MALFORMED_JSON`, `HTTP_ERROR`, `EMPTY_STATE` |
| `error_message` | `TEXT` | Formatted human-readable explanation of failure |

---

## 🧪 Testing Edge Cases

You can test upstream fault injection through the **API Tester** page:

1. **Simulate a Timeout:**
   - Execute a request to an endpoint with high delay. The backend cuts off at 8.0s and returns error type `TIMEOUT`.
2. **Test SSRF Protection:**
   - Attempting to pass `path: "@attacker.com"` or `path: "/../secret"` will immediately fail validation with `400 Bad Request`.
3. **Verify Header Masking:**
   - Pass an `Authorization: Bearer secret` header. Navigate to the **History** tab and click the logged entry to verify the header is stored as `[REDACTED]`.
4. **Test Query Interface Safety:**
   - Run `SELECT * FROM request_logs; DROP TABLE request_logs;` in the SQL Query tab; the request is rejected with `403 Forbidden` (`Query contains forbidden keyword: DROP`).

