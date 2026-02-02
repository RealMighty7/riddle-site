// escaped.js
(() => {
  const ok = sessionStorage.getItem("tnr_escape_ok") === "1";
  const user = (sessionStorage.getItem("tnr_discord") || "").trim();

  if (!ok || !user) {
    window.location.replace("/"); // cannot bypass
    return;
  }

  // start escaped music
  (async () => {
    try { await window.Music?.unlock?.(); } catch {}
    try { await window.Music?.loadAll?.(); } catch {}
    try { window.Music?.setScene?.("escaped"); } catch {}
  })();

  const userEl = document.getElementById("escapeUser");
  const codeEl = document.getElementById("escapeCode");
  const errEl = document.getElementById("escapeErr");
  const verifyBtn = document.getElementById("escapeVerify");
  const backBtn = document.getElementById("escapeBack");
  const box = document.getElementById("turnstileBox");

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

  let tsToken = "";
  let tsWidget = null;

  async function getSiteKey() {
    try {
      const r = await fetch("/api/config", { cache: "no-store" });
      const j = await r.json();
      return j.turnstile_site_key || "";
    } catch {
      return "";
    }
  }

  async function mountTurnstile() {
    const siteKey = await getSiteKey();
    if (!siteKey) {
      if (errEl) errEl.textContent = "verification unavailable (missing site key)";
      return;
    }

    const attempt = () => {
      if (!window.turnstile || !box) return false;
      try {
        tsWidget = window.turnstile.render(box, {
          sitekey: siteKey,
          callback: (t) => { tsToken = String(t || ""); },
          "error-callback": () => { tsToken = ""; },
          "expired-callback": () => { tsToken = ""; },
        });
        return true;
      } catch {
        return false;
      }
    };

    if (attempt()) return;
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (attempt() || tries > 40) clearInterval(t);
    }, 100);
  }

  mountTurnstile();

  async function submit() {
    if (errEl) errEl.textContent = "";

    if (!tsToken) {
      if (errEl) errEl.textContent = "complete verification first";
      return;
    }

    verifyBtn.disabled = true;
    verifyBtn.textContent = "sending…";

    try {
      const res = await fetch("/api/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          discord: user,
          answer: code,
          turnstile: tsToken,
        }),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "request failed");

      verifyBtn.textContent = "sent";
      sessionStorage.setItem("tnr_escape_sent", "1");
      setTimeout(() => {
        verifyBtn.textContent = "verify + send";
        verifyBtn.disabled = false;
      }, 1400);
    } catch (e) {
      if (errEl) errEl.textContent = String(e?.message || e || "error");
      verifyBtn.disabled = false;
      verifyBtn.textContent = "verify + send";
      try { window.turnstile?.reset?.(tsWidget); } catch {}
      tsToken = "";
    }
  }

  verifyBtn?.addEventListener("click", submit);
  backBtn?.addEventListener("click", () => window.location.replace("/"));
})();
