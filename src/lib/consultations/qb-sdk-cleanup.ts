/**
 * Client-side utility to completely disconnect and destroy QuickBlox SDK sessions
 * when a user logs out from any device or screen.
 */
export function logoutQuickbloxSdk(): void {
  if (typeof window === "undefined") return;

  try {
    const qb = (window as any).QB;
    if (!qb) return;

    // 1. Close active WebRTC sessions / streams
    if (qb.webrtc) {
      try {
        if (typeof qb.webrtc.onDestroy === "function") {
          qb.webrtc.onDestroy();
        }
      } catch (rtcErr) {
        console.warn("[QuickBlox] WebRTC teardown error on logout:", rtcErr);
      }
    }

    // 2. Disconnect XMPP Chat
    if (qb.chat) {
      try {
        if (typeof qb.chat.disconnect === "function") {
          qb.chat.disconnect();
          console.log("[QuickBlox] Chat disconnected on logout.");
        }
      } catch (chatErr) {
        console.warn("[QuickBlox] Chat disconnect error on logout:", chatErr);
      }
    }

    // 3. Destroy REST Session
    if (typeof qb.destroySession === "function") {
      try {
        qb.destroySession(() => {
          console.log("[QuickBlox] Session destroyed on logout.");
        });
      } catch (sessErr) {
        console.warn("[QuickBlox] Session destroy error on logout:", sessErr);
      }
    }
  } catch (err) {
    console.warn("[QuickBlox] Teardown exception on logout:", err);
  }
}
