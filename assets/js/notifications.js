(function () {
  const MUTE_KEY = "portail-notifications-muted";
  const BELL_PATH =
    "M12 22a2.25 2.25 0 0 0 2.22-1.91h-4.44A2.25 2.25 0 0 0 12 22Zm8-5.5v-1l-1.5-1.5V10a6.5 6.5 0 0 0-5.25-6.37V2.5a1.25 1.25 0 1 0-2.5 0v1.13A6.5 6.5 0 0 0 5.5 10v4l-1.5 1.5v1l-.5.5v1h17v-1l-.5-.5Z";
  const EDIT_PATH =
    "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25ZM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z";
  const TRASH_PATH =
    "M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-1 12H8L7 9Zm3 2v8h1v-8h-1Zm3 0v8h1v-8h-1Z";

  let audioCtx = null;
  let audioUnlocked = false;

  function isMuted() {
    return localStorage.getItem(MUTE_KEY) === "true";
  }

  function setMuted(value) {
    localStorage.setItem(MUTE_KEY, value ? "true" : "false");
  }

  function ensureAudioContext() {
    if (audioCtx) {
      return audioCtx;
    }

    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) {
      return null;
    }

    audioCtx = new Ctx();
    return audioCtx;
  }

  function unlockAudio() {
    if (audioUnlocked) {
      return;
    }

    const ctx = ensureAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    audioUnlocked = true;
  }

  ["pointerdown", "keydown", "touchstart"].forEach((eventName) => {
    window.addEventListener(eventName, unlockAudio, {
      once: true,
      passive: true,
    });
  });

  function playChime(kind) {
    const ctx = ensureAudioContext();
    if (!ctx) {
      return;
    }

    const now = ctx.currentTime;
    const frequencies =
      kind === "delete" ? [520, 380] : kind === "update" ? [620, 780] : [660, 880];

    frequencies.forEach((freq, index) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + index * 0.13;

      oscillator.type = "sine";
      oscillator.frequency.value = freq;

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.2, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.32);
    });
  }

  function vibrate(kind) {
    if (!navigator.vibrate) {
      return;
    }

    const pattern =
      kind === "delete" ? [120] : kind === "update" ? [70, 60, 70] : [160, 70, 160];
    navigator.vibrate(pattern);
  }

  function iconFor(kind) {
    const path = kind === "delete" ? TRASH_PATH : kind === "update" ? EDIT_PATH : BELL_PATH;
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
  }

  function ensureToastContainer() {
    let container = document.getElementById("notification-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "notification-toast-container";
      container.className = "toast-container";
      container.setAttribute("aria-live", "polite");
      container.setAttribute("aria-atomic", "false");
      document.body.appendChild(container);
    }
    return container;
  }

  function showToast({ title, message, kind }) {
    const container = ensureToastContainer();
    const toast = document.createElement("div");
    toast.className = `toast toast-${kind}`;
    toast.innerHTML = `
      <div class="toast-icon">${iconFor(kind)}</div>
      <div class="toast-body">
        <strong>${title}</strong>
        <p>${message}</p>
      </div>
      <button class="toast-close" type="button" aria-label="Fermer la notification">&times;</button>
    `;
    container.appendChild(toast);

    const remove = () => {
      toast.classList.add("toast-hide");
      setTimeout(() => toast.remove(), 220);
    };

    toast.querySelector(".toast-close").addEventListener("click", remove);
    setTimeout(remove, 6500);
  }

  function showBrowserNotification({ title, message }) {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      return;
    }

    if (document.visibilityState === "visible") {
      return;
    }

    try {
      new Notification(title, { body: message });
    } catch (error) {
      console.warn("Notification navigateur impossible:", error);
    }
  }

  function notify({ title, message, kind }) {
    showToast({ title, message, kind });

    if (isMuted()) {
      return;
    }

    playChime(kind);
    vibrate(kind);
    showBrowserNotification({ title, message });
  }

  function labelForTable(table) {
    return table === "announcements" ? "annonce" : "document";
  }

  function handleRealtimeEvent(payload) {
    if (!payload || !payload.table) {
      return;
    }

    const isAnnouncement = payload.table === "announcements";
    const label = labelForTable(payload.table);
    const record = payload.eventType === "DELETE" ? payload.old : payload.new;
    const name = record && record.title ? record.title : null;

    if (payload.eventType === "INSERT") {
      notify({
        title: isAnnouncement ? "Nouvelle annonce" : "Nouveau document",
        message: name || `Un ${label} vient d'être publié.`,
        kind: "new",
      });
      return;
    }

    if (payload.eventType === "UPDATE") {
      notify({
        title: isAnnouncement ? "Annonce mise à jour" : "Document mis à jour",
        message: name || `Un ${label} a été modifié.`,
        kind: "update",
      });
      return;
    }

    if (payload.eventType === "DELETE") {
      notify({
        title: isAnnouncement ? "Annonce supprimée" : "Document supprimé",
        message: name || `Un ${label} a été supprimé.`,
        kind: "delete",
      });
    }
  }

  async function requestPermissionAndUnlock() {
    unlockAudio();

    if (!("Notification" in window)) {
      return "unsupported";
    }

    if (Notification.permission === "granted" || Notification.permission === "denied") {
      return Notification.permission;
    }

    try {
      return await Notification.requestPermission();
    } catch (error) {
      return "denied";
    }
  }

  function initToggleButton() {
    const toggle = document.getElementById("notifications-toggle");
    if (!toggle) {
      return;
    }

    function syncState() {
      const muted = isMuted();
      toggle.classList.toggle("is-muted", muted);
      toggle.setAttribute("aria-pressed", muted ? "false" : "true");
      toggle.setAttribute(
        "aria-label",
        muted
          ? "Activer les notifications sonores et vibrations"
          : "Désactiver les notifications sonores et vibrations",
      );
    }

    syncState();

    toggle.addEventListener("click", async () => {
      const nextMuted = !isMuted();
      setMuted(nextMuted);
      syncState();

      if (!nextMuted) {
        await requestPermissionAndUnlock();
        notify({
          title: "Notifications activées",
          message: "Vous recevrez un son et une vibration à chaque publication.",
          kind: "new",
        });
      }
    });
  }

  document.addEventListener("DOMContentLoaded", initToggleButton);

  window.PortailNotifications = {
    handleRealtimeEvent,
    notify,
    isMuted,
    setMuted,
    requestPermissionAndUnlock,
  };
})();
