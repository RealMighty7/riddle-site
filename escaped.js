(() => {
  // Only show escape UI if URL says escaped=1 AND we have a code in this tab.
  const params = new URLSearchParams(location.search);
  const isEscape = params.get("escaped") === "1";
  const code = sessionStorage.getItem("escape_code") || "";

  const escapeUI = document.getElementById("escapeUI");
  const escapeCode = document.getElementById("escapeCode");
  const escapeHint = document.getElementById("escapeHint");
  const btnCopy = document.getElementById("btnCopy");
  const btnRestart = document.getElementById("btnRestart");

  function goHome() {
    sessionStorage.removeItem("escape_code");
    location.href = "/";
  }

  // If user loads the site without being sent here properly, kick them back.
  if (!isEscape || !code) {
    if (escapeUI) escapeUI.classList.add("hidden");
    // Send them back to the landing page.
    location.href = "/";
    return;
  }

  // Show UI + populate code
  escapeUI.classList.remove("hidden");
  escapeCode.textContent = code;
  escapeHint.textContent = "Save this code. You won’t see it again.";

  btnCopy?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(code);
      escapeHint.textContent = "Copied.";
      setTimeout(() => (escapeHint.textContent = "Save this code. You won’t see it again."), 900);
    } catch {
      escapeHint.textContent = "Copy failed (your browser blocked it).";
    }
  });

  btnRestart?.addEventListener("click", () => {
    goHome();
  });
})();
