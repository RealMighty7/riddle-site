// escaped.js
(() => {
  const ok = sessionStorage.getItem("tnr_escape_ok") === "1";
  const user = (sessionStorage.getItem("tnr_discord") || "").trim();

  if (!ok || !user) {
    window.location.replace("/"); // cannot bypass
    return;
  }

  // User request: background music only in the simulation room.
  try { window.Music?.stopAll?.(); } catch {}
  try { window.Music?.setScene?.("landing"); } catch {}

  // User request: background music only in the simulation room.
  // Ensure stems are silenced on escaped page.
  try { window.Music?.stopAll?.(); } catch {}
  try { window.Music?.setScene?.("landing"); } catch {}

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

    if (backBtn) backBtn.onclick = () => { window.location.href = "/"; };
})();
