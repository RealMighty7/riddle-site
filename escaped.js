// escaped.js
(() => {
  const ok = sessionStorage.getItem("tnr_escape_ok") === "1";
  const user = (sessionStorage.getItem("tnr_discord") || "").trim();

  if (!ok || !user) {
    window.location.replace("/"); // cannot bypass
    return;
  }

  // Stop stem music if running
  try { window.Music?.stopAll?.(); } catch {}
  try { window.Music?.setScene?.("none"); } catch {}

  // Dedicated escaped music: Escaped.WAV
  const escapedMusic = new Audio("/music/Escaped.WAV");
  escapedMusic.loop = true;
  escapedMusic.volume = 0.85;

  (async () => {
    try { await window.Music?.unlock?.(); } catch {}
    try { await window.TTS?.unlock?.(); } catch {}
    try { await escapedMusic.play(); } catch {}
  })();

  const userEl = document.getElementById("escapeUser");
  const codeEl = document.getElementById("escapeCode");
  const errEl = document.getElementById("escapeErr");
  const verifyBtn = document.getElementById("escapeVerify");
  const backBtn = document.getElementById("escapeBack");

  if (verifyBtn) verifyBtn.classList.add("hidden");

  function makeCode() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
    return out;
  }

  const code = makeCode();
  sessionStorage.setItem("tnr_escape_code", code);

  if (userEl) userEl.textContent = `user: ${user}`;
  if (codeEl) codeEl.textContent = `code: ${code}`;

  async function submit() {
    try {
      const res = await fetch("/api/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          discord: user,
          answer: code,
          // Turnstile optional; keep empty if not present
          turnstile: "",
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "submit failed");
      if (errEl) errEl.textContent = "sent.";
      return true;
    } catch (e) {
      if (errEl) errEl.textContent = `error: ${e?.message || e}`;
      return false;
    }
  }

  // Auto-send on load (no button)
  submit();

  if (backBtn) {
    backBtn.onclick = () => {
      try { escapedMusic.pause(); } catch {}
      window.location.href = "/";
    };
  }
})();
