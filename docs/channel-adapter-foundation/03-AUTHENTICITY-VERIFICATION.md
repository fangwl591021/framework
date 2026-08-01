# Authenticity Verification

Authenticity is verified over the original bytes before JSON parsing. The Local Web adapter uses Web Crypto HMAC verification, a server-owned local fixture key, a bounded timestamp window, and constant-time platform verification. Invalid, missing, or expired signatures fail closed and create only safe sidecar evidence.

No production secret, provider signature algorithm, remote endpoint, or provider credential is defined. A future adapter requires separate Architecture and Security approval.

