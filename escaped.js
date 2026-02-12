// escaped.js
(() => {
  const ok = sessionStorage.getItem("tnr_escape_ok") === "1";
  const user = (sessionStorage.getItem("tnr_discord") || "").trim();

  if (!ok || !user) {
    window.location.replace("./"); // cannot bypass
    return;
  }

  // Prevent refresh spam: once we send, a reload should bounce to index.
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

  // Escaped page has its own cue (no sim stems).
  try { window.Music?.stopAll?.(); } catch {}
  try { window.Music?.setScene?.("escaped"); } catch {}

  const userEl = document.getElementById("escapeUser");
  const codeEl = document.getElementById("escapeCode");
  const errEl = document.getElementById("escapeErr");
  const verifyBtn = document.getElementById("escapeVerify");
  const backBtn = document.getElementById("escapeBack");

  if (verifyBtn) verifyBtn.classList.add("hidden");

  // We no longer generate or display a reward code.
  sessionStorage.removeItem("tnr_escape_code");

  if (userEl) userEl.textContent = `user: ${user}`;
  if (codeEl) codeEl.textContent = "";

  async function submit() {
    try {
      const res = await fetch("/api/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          discord: user,
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

  // Auto-send on load (no button)
  submit();

    if (backBtn) backBtn.onclick = () => { window.location.href = "./"; };
})();
