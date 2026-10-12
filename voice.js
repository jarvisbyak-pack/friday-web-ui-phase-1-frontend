(() => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const synth = window.speechSynthesis;
  const face = document.getElementById("face-mode");
  const faceState = document.getElementById("face-state");
  const faceStatus = document.getElementById("face-status");
  const mainPrompt = document.getElementById("prompt");
  const facePrompt = document.getElementById("face-prompt");
  const voiceButtons = document.querySelectorAll('[data-action="voice"]');

  let recognition = null;
  let listening = false;
  let speaking = false;
  let shouldRestart = false;

  const setState = (state, status) => {
    if (faceState) faceState.textContent = state;
    if (faceStatus && status) faceStatus.textContent = status;
    if (face) face.dataset.voiceState = state.toLowerCase();
    document.body.dataset.voiceState = state.toLowerCase();
  };

  const setTranscript = text => {
    if (mainPrompt) {
      mainPrompt.value = text;
      mainPrompt.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (facePrompt) facePrompt.value = text;
  };

  const stopSpeaking = () => {
    if (!synth) return;
    synth.cancel();
    speaking = false;
    if (!listening) setState("Ready", "Friday online");
  };

  const speak = text => {
    if (!synth || !text) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(String(text).replace(/<[^>]*>/g, ""));
    utterance.lang = document.documentElement.lang || "en-US";
    utterance.rate = Number(localStorage.getItem("friday_voice_rate") || "1.02");
    utterance.pitch = Number(localStorage.getItem("friday_voice_pitch") || "1.0");
    const preferred = localStorage.getItem("friday_voice_name");
    const voices = synth.getVoices();
    const voice = voices.find(item => item.name === preferred) || voices.find(item => /^en(-|_)/i.test(item.lang));
    if (voice) utterance.voice = voice;
    speaking = true;
    setState("Speaking", "Friday is responding");
    utterance.onend = () => {
      speaking = false;
      setState("Done", "Friday online");
      window.setTimeout(() => {
        if (!listening) setState("Ready", "Friday online");
      }, 700);
    };
    utterance.onerror = () => {
      speaking = false;
      if (!listening) setState("Ready", "Friday online");
    };
    synth.speak(utterance);
  };

  const startListening = () => {
    if (!SpeechRecognition) {
      setState("Ready", "Speech recognition is not supported in this browser");
      if (typeof window.showToast === "function") window.showToast("Use Chrome or Edge for voice input.");
      return;
    }
    if (speaking) stopSpeaking();
    if (listening) {
      shouldRestart = false;
      recognition?.stop();
      return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = localStorage.getItem("friday_voice_language") || "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    shouldRestart = false;
    listening = true;
    setState("Listening", "Listening…");
    voiceButtons.forEach(button => button.classList.add("active"));

    recognition.onresult = event => {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }
      setTranscript(transcript.trim());
    };

    recognition.onerror = event => {
      listening = false;
      voiceButtons.forEach(button => button.classList.remove("active"));
      setState("Ready", event.error === "not-allowed" ? "Microphone permission is required" : "Voice input error");
      if (typeof window.showToast === "function") {
        window.showToast(event.error === "not-allowed"
          ? "Allow microphone access for Friday voice input."
          : "Voice input failed: " + event.error);
      }
    };

    recognition.onend = async () => {
      listening = false;
      voiceButtons.forEach(button => button.classList.remove("active"));
      const value = (mainPrompt?.value || "").trim();
      if (!value) {
        setState("Ready", "Friday online");
        return;
      }
      setState("Processing", "Sending to Friday…");
      if (typeof window.FridayVoiceSend !== "function") {
        setState("Ready", "Voice pipeline is not connected");
        return;
      }
      try {
        await window.FridayVoiceSend(value);
      } finally {
        if (!speaking) setState("Done", "Friday online");
      }
    };

    recognition.start();
  };

  document.addEventListener("click", event => {
    const button = event.target.closest('[data-action="voice"]');
    if (!button) return;
    event.preventDefault();
    startListening();
  });

  window.FridayVoiceSpeak = speak;
  window.FridayVoiceStopSpeaking = stopSpeaking;
  window.FridayVoiceStartListening = startListening;

  if (synth) synth.onvoiceschanged = () => synth.getVoices();

  // Stop Friday speaking as soon as the user asks to speak again.
  document.addEventListener("keydown", event => {
    if (event.target === mainPrompt && event.key.length === 1 && speaking) stopSpeaking();
  });
})();