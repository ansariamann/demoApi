CREATE TABLE IF NOT EXISTS request_logs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp       TEXT    NOT NULL DEFAULT (datetime('now')),
  method          TEXT    NOT NULL,
  url             TEXT    NOT NULL,
  endpoint        TEXT,
  request_headers TEXT,
  request_body    TEXT,
  query_params    TEXT,
  status_code     INTEGER,
  response_body   TEXT,
  response_time   INTEGER,
  is_success      INTEGER NOT NULL DEFAULT 0,
  error_type      TEXT,
  error_message   TEXT
);
