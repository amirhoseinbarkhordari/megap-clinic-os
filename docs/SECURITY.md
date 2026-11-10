# Security status

Security controls are currently requirements only; no authentication or authorization exists. Do not use real clinic or patient data.

Before sensitive workflows ship, implement password hashing, secure session/refresh rotation, brute-force rate limits, DTO validation, server-side permission and tenant enforcement, PostgreSQL tenant policies, audited sensitive access, private file authorization, secret management, safe error handling, backups, and cross-tenant negative tests.
