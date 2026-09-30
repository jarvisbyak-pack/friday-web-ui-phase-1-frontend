(() => {
  const face = document.getElementById("face-mode");
  const open = document.querySelector('[data-action="face"]');
  const close = document.querySelector('[data-action="close-face"]');
  const facePrompt = document.getElementById("face-prompt");
  const mainPrompt = document.getElementById("prompt");
  const composer = document.getElementById("composer");
  const faceStatus = document.getElementById("face-status");
  const faceState = document.getElementById("face-state");
  const orb = document.getElementById("face-orb");
  const statusText = document.getElementById("status-text");

  if (!face || !open) return;

  const syncStatus = () => {
    const value = (statusText?.textContent || "Friday online").trim();
    faceStatus.textContent = value;
    const busy = /working|thinking|running|processing/i.test(value);
    const error = /error|failed|offline|required/i.test(value);
    orb.classList.toggle("is-working", busy);
    orb.classList.toggle("is-error", error);
    faceState.textContent = busy ? "Working on your request…" : error ? "Waiting for your attention" : "Ready";
  };

  const show = () => {
    face.classList.add("visible");
    document.body.classList.add("face-open");
    facePrompt.focus();
    syncStatus();
  };

  const hide = () => {
    face.classList.remove("visible");
    document.body.classList.remove("face-open");
  };

  open.addEventListener("click", show);
  close?.addEventListener("click", hide);

  face.addEventListener("click", event => {
    if (event.target === face) hide();
  });

  facePrompt.addEventListener("input", () => {
    if (mainPrompt) {
      mainPrompt.value = facePrompt.value;
      mainPrompt.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });

  facePrompt.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (mainPrompt && composer) composer.requestSubmit();
      facePrompt.value = "";
    }
  });

  document.addEventListener("click", event => {
    if (event.target.closest('[data-action="voice"]')) {
      face.classList.add("voice-pulse");
      setTimeout(() => face.classList.remove("voice-pulse"), 900);
    }
  });

  if (statusText) {
    new MutationObserver(syncStatus).observe(statusText, { childList: true, characterData: true, subtree: true });
  }

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && face.classList.contains("visible")) hide();
  });

  syncStatus();
})();