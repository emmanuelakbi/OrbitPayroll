# Requirements Document: OrbitPayroll Observability & Logging

## Introduction

This document specifies the observability and logging requirements for OrbitPayroll, defining how the system captures, structures, and exposes operational data for debugging and monitoring.

## Glossary

- **Structured_Log**: Log entry with consistent JSON format and fields
- **Correlation_ID**: Unique identifier linking related log entries across requests
- **Log_Level**: Severity classification (debug, info, warn, error)
- **Metric**: Quantitative measurement of system behavior
- **Trace**: End-to-end request path through system components
- **Alert**: Notification triggered by abnormal conditions
- **Dashboard**: Visual display of system metrics and status

## Requirements

### Requirement 1: Structured Logging Format

**User Story:** As a developer, I want structured logs, so that I can search and analyze log data efficiently.

#### Acceptance Criteria

1. THE Logging_System SHALL output logs in JSON format
2. THE Logging_System SHALL include standard fields: timestamp, level, message, service
3. THE Logging_System SHALL include correlation_id for request tracing
4. THE Logging_System SHALL include context fields: user_id, org_id, wallet_address where applicable
5. THE Logging_System SHALL use ISO 8601 timestamp format
6. THE Logging_System SHALL support log levels: debug, info, warn, error

### Requirement 2: Request Logging

**User Story:** As a developer, I want request logs, so that I can trace API calls and debug issues.

#### Acceptance Criteria

1. THE Logging_System SHALL log all incoming HTTP requests
2. THE Request_Log SHALL include: method, path, status_code, duration_ms
3. THE Request_Log SHALL include correlation_id from request header or generate new
4. THE Request_Log SHALL include user_id if authenticated
5. THE Request_Log SHALL NOT log sensitive headers (Authorization, Cookie)
6. THE Request_Log SHALL NOT log request/response bodies by default (configurable)
7. THE Logging_System SHALL log at INFO level for successful requests, WARN for 4xx, ERROR for 5xx

### Requirement 3: Error Logging

**User Story:** As a developer, I want detailed error logs, so that I can diagnose and fix issues quickly.

#### Acceptance Criteria

1. THE Logging_System SHALL log all errors with ERROR level
2. THE Error_Log SHALL include: error message, error code, stack trace (in development)
3. THE Error_Log SHALL include request context: path, method, user_id, org_id
4. THE Error_Log SHALL NOT include stack traces in production (security)
5. THE Error_Log SHALL include correlation_id for tracing
6. THE Logging_System SHALL sanitize error messages (no sensitive data)

### Requirement 4: Blockchain Operation Logging

**User Story:** As a developer, I want blockchain logs, so that I can debug Web3 interactions.

#### Acceptance Criteria

1. THE Logging_System SHALL log all RPC calls with method and duration
2. THE Logging_System SHALL log RPC errors with method, params (sanitized), error
3. THE Logging_System SHALL log transaction submissions with tx_hash
4. THE Logging_System SHALL log transaction confirmations with block_number
5. THE Logging_System SHALL log contract events received
6. THE Logging_System SHALL NOT log private keys or signatures

### Requirement 5: Audit Logging

**User Story:** As a compliance officer, I want audit logs, so that I can track security-relevant actions.

#### Acceptance Criteria

1. THE Logging_System SHALL log authentication events: login_success, login_failure, logout
2. THE Logging_System SHALL log authorization failures with user, action, resource
3. THE Logging_System SHALL log data modifications: contractor_created, contractor_updated, contractor_archived
4. THE Logging_System SHALL log payroll events: payroll_previewed, payroll_executed
5. THE Logging_System SHALL log admin actions: member_added, member_removed, role_changed
6. THE Audit_Log SHALL be stored in database events table for persistence

### Requirement 6: Log Aggregation

**User Story:** As a DevOps engineer, I want centralized logs, so that I can search across all components.

#### Acceptance Criteria

1. THE Logging_System SHALL output to stdout for container compatibility
2. THE Logging_System SHALL support log aggregation via platform (Vercel, Railway)
3. THE Logging_System MAY integrate with external logging service (optional for MVP)
4. THE Logging_System SHALL support log filtering by level, service, correlation_id
5. THE Logging_System SHALL retain logs for minimum 7 days

### Requirement 7: Performance Metrics

**User Story:** As a developer, I want performance metrics, so that I can identify bottlenecks.

#### Acceptance Criteria

1. THE Logging_System SHALL log request duration for all API endpoints
2. THE Logging_System SHALL log database query duration for slow queries (>100ms)
3. THE Logging_System SHALL log RPC call duration
4. THE Logging_System SHALL log payroll calculation duration
5. THE Logging_System MAY expose metrics endpoint for Prometheus (optional)

### Requirement 8: Error Tracking Integration

**User Story:** As a developer, I want error tracking, so that I'm notified of production errors.

#### Acceptance Criteria

1. THE Logging_System MAY integrate Sentry for error tracking (optional for MVP)
2. IF Sentry is enabled THEN the Logging_System SHALL capture unhandled exceptions
3. IF Sentry is enabled THEN the Logging_System SHALL include user context
4. IF Sentry is enabled THEN the Logging_System SHALL group similar errors
5. THE Logging_System SHALL support disabling error tracking via environment variable

### Requirement 9: Health and Status Endpoints

**User Story:** As a DevOps engineer, I want status endpoints, so that I can monitor system health.

#### Acceptance Criteria

1. THE Backend SHALL expose `GET /health` returning overall status
2. THE Health_Endpoint SHALL check database connectivity
3. THE Health_Endpoint SHALL check RPC provider connectivity (with timeout)
4. THE Health_Endpoint SHALL return JSON: { status, components: { db, rpc }, timestamp }
5. THE Health_Endpoint SHALL return 200 if healthy, 503 if unhealthy
6. THE Health_Endpoint SHALL complete within 5 seconds

### Requirement 10: Development Debugging

**User Story:** As a developer, I want debugging tools, so that I can troubleshoot during development.

#### Acceptance Criteria

1. THE Logging_System SHALL support DEBUG level in development
2. THE Logging_System SHALL pretty-print JSON logs in development (human readable)
3. THE Logging_System SHALL include request/response bodies in DEBUG mode
4. THE Frontend SHALL include React Query devtools in development
5. THE Frontend SHALL log API calls to browser console in development
6. THE Logging_System SHALL support log level configuration via environment variable
