# Usage Dashboard

The dashboard uses four fixed aggregate queries: totals, by task, by provider, and by outcome. It does not issue per-row follow-up queries.

Displayed totals are Requests, Succeeded, Cached, Rejected, Fallback, Input Units, Output Units, and Estimated Cost. Cost is explicitly labelled `Estimate - Not Billing`.

The default range is 30 days and the server clamps all ranges to 90 days. Group lists are capped at 20 rows and request history at 50 rows.

Tenant Owners see only their Tenant. Only the allowlisted Platform Operator local fixture receives cross-Tenant aggregate access. Selecting a browser label does not establish authority; the server maps the allowlisted fixture to trusted IDs and permissions.
