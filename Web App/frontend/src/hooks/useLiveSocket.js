import { useEffect, useRef, useState } from "react";

/**
 * Subscribe to the authenticated `/ws` stream for a set of server events.
 *
 * Every page the moderator runs on (dashboard, presenter, panels list,
 * projects) shares the same server-side broadcast channel — rather than
 * each page re-implementing the WS boilerplate, they all call this hook
 * with the events they care about.
 *
 *   const { connected } = useLiveSocket({
 *     panel_discussion_changed: (data) => setEnabled(data.discussion_enabled),
 *     voting_open_changed:      (data) => setVotingOpen(data.voting_open),
 *   });
 *
 * Handler identity is refreshed on every render via a ref so you don't
 * need to memoise them — the hook only reconnects when the token changes.
 *
 * Returns `{ connected }` — drive a LiveDot from this.
 */
export function useLiveSocket(handlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const url = `${proto}://${window.location.host}/ws?token=${encodeURIComponent(token)}`;
    let ws;
    let reconnectTimer = null;
    let aborted = false;

    function open() {
      if (aborted) return;
      ws = new WebSocket(url);
      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        // Retry after 2s — covers transient network drops during the event.
        if (!aborted) reconnectTimer = setTimeout(open, 2000);
      };
      ws.onerror = () => { /* onclose will fire right after */ };
      ws.onmessage = (ev) => {
        let msg;
        try { msg = JSON.parse(ev.data); } catch { return; }
        const fn = msg?.event && handlersRef.current?.[msg.event];
        if (typeof fn === "function") fn(msg.data, msg);
      };
    }

    open();
    return () => {
      aborted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try { ws && ws.close(); } catch { /* noop */ }
    };
    // Only re-run if the tab reloads (token change forces a full reload
    // anyway via logout/login).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { connected };
}
