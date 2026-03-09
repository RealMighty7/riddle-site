// escaped.js
(() => {
  const ok = sessionStorage.getItem("tnr_escape_ok") === "1";
  const user = (sessionStorage.getItem("tnr_discord") || "").trim();
  const sent = sessionStorage.getItem("tnr_escape_sent") === "1";
  if (sent) {
    // Prevent refresh abuse / duplicate emails
    sessionStorage.removeItem("tnr_escape_ok");
    window.location.replace("index.html");
    return;
  }

  if (!ok || !user) {
    window.location.replace("./"); // cannot bypass
    return;
  }

  try {
    const nav = performance.getEntriesByType?.("navigation")?.[0];
    const isReload = nav && nav.type === "reload";
    if (sessionStorage.getItem("tnr_escape_sent") === "1" || isReload) {
      // Clear flags so the flow must be re-earned.
      sessionStorage.removeItem("tnr_escape_ok");
      sessionStorage.removeItem("tnr_discord");
      window.location.replace("./");
      return;
    }
  } catch {}

  // Music: a fresh page load can trigger autoplay restrictions.
  // We attempt immediately (works in some navigations), and also arm a one-time
  // gesture unlock so the Escaped bed reliably plays.
  let musicArmed = false;
  async function startEscapedMusic() {
    if (musicArmed) return;
    musicArmed = true;
    try {
      await window.Music?.unlock?.();
      await window.Music?.loadAll?.();
      window.Music?.stopAll?.();
      window.Music?.setScene?.("escaped");
    } catch {}
  }
  startEscapedMusic();
  document.addEventListener("pointerdown", startEscapedMusic, { once: true, passive: true });
  document.addEventListener("keydown", startEscapedMusic, { once: true });

  const userEl = document.getElementById("escapeUser");
  const codeEl = document.getElementById("escapeCode");
  const errEl = document.getElementById("escapeErr");
  const verifyBtn = document.getElementById("escapeVerify");
  const backBtn = document.getElementById("escapeBack");

  if (verifyBtn) verifyBtn.classList.add("hidden");

  // Generate a one-time escape code (what gets emailed to you).
  // This is the "answer" that the /api/complete endpoint expects.
  const ALPH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const randCode = (len = 10) => {
    let out = "";
    for (let i = 0; i < len; i++) out += ALPH[Math.floor(Math.random() * ALPH.length)];
    return out;
  };

  let escapeCode = (sessionStorage.getItem("tnr_escape_code") || "").trim();
  if (!escapeCode) {
    escapeCode = randCode(10);
    try { sessionStorage.setItem("tnr_escape_code", escapeCode); } catch {}
  }

  if (userEl) userEl.textContent = `user: ${user}`;
  if (codeEl) codeEl.textContent = escapeCode;

  async function submit() {
    try {
      const res = await fetch(new URL("api/complete", document.baseURI).toString(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          discord: user,
          answer: escapeCode,
          // Turnstile optional; keep empty if not present
          turnstile: "",
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "submit failed");
      if (errEl) errEl.textContent = "sent.";
      try { sessionStorage.setItem("tnr_escape_sent","1"); } catch {}
      return true;
    } catch (e) {
      if (errEl) errEl.textContent = `error: ${e?.message || e}`;
      return false;
    }
  }

  submit();

    if (backBtn) backBtn.onclick = () => { window.location.href = "./"; };
})();
