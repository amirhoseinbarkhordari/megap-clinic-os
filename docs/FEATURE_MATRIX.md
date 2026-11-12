# Feature Matrix

Legend: ✅ implemented (code present; execution unverified in audit) · 🟡 partial · ❌ missing

| Area | Feature | API | UI | DB | Tests | Notes |
|---|---|---|---|---|---|---|
| Auth | Register clinic, login, refresh, logout | ✅ | ✅ | ✅ | 🟡 | |
| Auth | Password recovery, phone verify, invitations, MFA, rate limit | ❌ | ❌ | ❌ | ❌ | |
| Auth | User/role management, multi-tenant switch | 🟡 | ❌ | ✅ | ❌ | memberships exist |
| Dashboard | KPIs | 🟡 | 🟡 | – | ❌ | |
| Appointments | Create/list/status | ✅ | 🟡 | ✅ | ✅ | overlap exclusion |
| Appointments | Calendar, reschedule, waitlist, availability, buffers | ❌ | ❌ | ❌ | ❌ | |
| Patients | CRUD-lite, search | 🟡 | ✅ | ✅ | ✅ | no update/archive/timeline |
| Medical records | Encounters, encrypted notes, consent, audit | ✅ | ❌ | ✅ | ✅ | media missing |
| Services/packages | Services | ✅ | ❌ | ✅ | 🟡 | packages missing |
| Staff | Staff | ✅ | ❌ | ✅ | 🟡 | hours/commissions missing |
| Finance | Invoices, payments, expenses, full refund, reports | ✅ | ✅ | ✅ | ✅ | |
| Finance | Cash register, commissions, partial refunds | ❌ | ❌ | ❌ | ❌ | needs financial review |
| Inventory | Products, balances, movements, alerts | ✅ | ✅ | ✅ | ✅ | |
| Inventory | Suppliers, POs, treatment consumption | ❌ | ❌ | ❌ | ❌ | |
| Marketing | SMS provider abstraction, campaigns | ❌ | ❌ | ❌ | ❌ | |
| Analytics | Reports beyond finance | ❌ | ❌ | – | ❌ | |
| Portal | Patient portal | ❌ | ❌ | ❌ | ❌ | |
| Platform admin | Tenants/subscriptions (no PHI access) | ❌ | ❌ | 🟡 | ❌ | |
| Localization | RTL, Persian | – | ✅ | – | – | Jalali/Toman display unverified |
