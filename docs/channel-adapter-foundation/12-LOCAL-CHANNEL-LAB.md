# Local Channel Lab

The Local Channel Lab is available only through the local demo entry at `/local/channel-lab/`, with event and delivery views. It uses fixed server-owned scenarios for success, replay, conflict, signature failure, identity states, traffic rejection, unsupported events, rendering, and disabled adapters.

The Lab requires the existing local session, Same-Origin, CSRF, and Platform Operator fixture authorization. It accepts no arbitrary provider, endpoint, token, signature secret, Tenant, Application, or payload. DOM output uses `textContent`. Outside local mode every Lab route fails closed with 404.

