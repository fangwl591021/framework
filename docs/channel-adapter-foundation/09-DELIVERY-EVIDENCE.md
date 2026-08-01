# Delivery Evidence

Delivery records track processing lease, fence, safe stored result, and terminal outcome. Evidence records contain only bounded status, reason, identity outcome, Workbench outcome, response type, latency bucket, digests, correlation reference, and support code. Completed evidence is immutable.

Evidence never contains raw payload, raw UID, message text, token, signature, provider response, HTTP header, SQL, stack trace, secret, or endpoint. Support Codes expose only authorized safe summaries through existing diagnostics policy.

