(() => {
  const $ = s => document.querySelector(s);
  const sidebar = $("#sidebar");
  const prompt = $("#prompt");
  const composer = $("#composer");
  const conversation = $("#conversation");
  const welcome = $("#welcome");
  const suggestions = $("#suggestions");
  const toast = $("#toast");
  const fileInput = $("#file-input");
  const authOverlay = $("#auth-overlay");
  const authForm = $("#auth-form");
  const authEmail = $("#auth-email");
  const authPassword = $("#auth-password");
  const authMode = $("#auth-mode");
  const authSubmit = $("#auth-submit");
  const authSwitch = $("#auth-switch");
  const authError = $("#auth-error");
  const apiUrlInput = $("#api-url");
  const settingsPanel = $("#settings-panel");
  const connectionState = $("#connection-state");
  const taskState = $("#task-state");
  const statusText = $("#status-text");
  const profileButton = $("#profile-button");
  const logoutButton = $("#logout-button");

  let currentUser = null;
  let currentConversationId = FridayApi.getConversationId();
  let eventAbortController = null;
  let authRegisterMode = false;
  let sending = false;

  const showToast = message => {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
  };

  const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));

  const renderText = value => escapeHtml(value).replace(/\n/g, "<br>");

  const resize = () => {
    prompt.style.height = "auto";
    prompt.style.height = Math.min(prompt.scrollHeight, 180) + "px";
  };

  const setStatus = (text, mode = "online") => {
    statusText.textContent = text;
    const dot = $(".status-dot");
    dot.classList.toggle("busy", mode === "busy");
    dot.classList.toggle("error", mode === "error");
  };

  const setTaskState = (text, visible = true) => {
    taskState.textContent = text;
    taskState.classList.toggle("visible", visible);
  };

  const showAuth = message => {
    authOverlay.classList.add("visible");
    authError.textContent = message || "";
    authError.classList.toggle("visible", Boolean(message));
    authEmail.focus();
  };

  const hideAuth = () => {
    authOverlay.classList.remove("visible");
    authError.classList.remove("visible");
  };

  const resetConversationView = () => {
    conversation.innerHTML = "";
    conversation.classList.remove("visible");
    welcome.style.display = "";
    suggestions.style.display = "";
    prompt.value = "";
    resize();
    setTaskState("", false);
  };

  const appendMessage = (role, content, extra = {}) => {
    welcome.style.display = "none";
    suggestions.style.display = "none";
    conversation.classList.add("visible");

    const node = document.createElement("div");
    node.className = "message " + (role === "user" ? "user" : "friday");
    node.dataset.messageRole = role;
    const label = role === "user" ? "You" : "Friday";
    const attachment = extra.attachment
      ? '<div class="attachment-chip">📎 ' + escapeHtml(extra.attachment) + "</div>"
      : "";
    node.innerHTML = '<span class="label">' + label + "</span>" + renderText(content) + attachment;
    conversation.appendChild(node);
    conversation.scrollTop = conversation.scrollHeight;
    return node;
  };

  const appendWorkingMessage = () => {
    const node = appendMessage("assistant", "Working…");
    node.classList.add("working");
    return node;
  };

  const loadConversation = async id => {
    if (!id) return;
    const result = await FridayApi.listMessages(id);
    conversation.innerHTML = "";
    if (!result.messages.length) {
      resetConversationView();
      return;
    }
    welcome.style.display = "none";
    suggestions.style.display = "none";
    conversation.classList.add("visible");
    result.messages.forEach(message => {
      if (message.role === "user" || message.role === "assistant") {
        appendMessage(message.role, message.content);
      }
    });
  };

  const ensureConversation = async firstMessage => {
    if (currentConversationId) {
      try {
        await FridayApi.listMessages(currentConversationId);
        return currentConversationId;
      } catch (error) {
        if (error.status !== 404) throw error;
        currentConversationId = "";
      }
    }

    const title = firstMessage.length > 60 ? firstMessage.slice(0, 57) + "…" : firstMessage;
    const result = await FridayApi.createConversation(title || "Friday conversation");
    currentConversationId = result.conversation.id;
    return currentConversationId;
  };

  const refreshHistory = async () => {
    if (!currentUser) return;
    const result = await FridayApi.listConversations();
    const history = $(".history");
    history.querySelectorAll(".dynamic-history").forEach(node => node.remove());

    const todayLabel = history.querySelector(".today");
    const recent = result.conversations.slice(0, 12);
    recent.forEach(item => {
      const button = document.createElement("button");
      button.className = "history-item dynamic-history" + (item.id === currentConversationId ? " selected" : "");
      button.dataset.conversationId = item.id;
      button.textContent = item.title || "Untitled conversation";
      todayLabel.before(button);
    });
  };

  const updateConnection = async () => {
    try {
      const health = await FridayApi.health();
      connectionState.textContent = health.ok ? "Backend connected" : "Backend unavailable";
      connectionState.className = health.ok ? "connected" : "error";
    } catch {
      connectionState.textContent = "Backend unavailable";
      connectionState.className = "error";
    }
  };

  const handleSend = async text => {
    const value = (text ?? prompt.value).trim();
    if (!value || sending) return;

    if (!FridayApi.getToken()) {
      showAuth("Sign in to send tasks to Friday.");
      return;
    }

    sending = true;
    prompt.value = "";
    resize();
    setStatus("Friday is working…", "busy");

    const userNode = appendMessage("user", value);
    const workingNode = appendWorkingMessage();

    try {
      const conversationId = await ensureConversation(value);
      await FridayApi.addMessage(conversationId, "user", value);

      const uploaded = [];
      for (const file of Array.from(fileInput.files || [])) {
        const result = await FridayApi.uploadFile(file);
        uploaded.push(result.file);
      }
      fileInput.value = "";

      const attachmentContext = uploaded.length
        ? "\n\nAttached files: " + uploaded.map(file => file.name + " (" + file.id + ")").join(", ")
        : "";

      const messages = [
        { role: "system", content: "You are Friday, a web-based AI agent. Work carefully, use available tools when useful, and report concrete results. Do not claim an action succeeded unless the tool result confirms it." },
        { role: "user", content: value + attachmentContext }
      ];

      const created = await FridayApi.createAgentTask(messages, { maxSteps: 8 });
      const taskId = created.task.id;
      setTaskState("Task " + taskId.slice(0, 8) + " • queued");

      if (eventAbortController) eventAbortController.abort();
      eventAbortController = new AbortController();

      const eventPromise = FridayApi.readTaskEvents(
        taskId,
        0,
        event => {
          const label = event.type
            .replace(/^agent\./, "")
            .replace(/^task\./, "")
            .replace(/\./g, " ");
          setTaskState("Task " + taskId.slice(0, 8) + " • " + label);
        },
        eventAbortController.signal
      ).catch(error => {
        if (!eventAbortController.signal.aborted) showToast(error.message);
      });

      let task;
      const deadline = Date.now() + 10 * 60 * 1000;
      while (Date.now() < deadline) {
        task = (await FridayApi.getTask(taskId)).task;
        if (task.state === "completed" || task.state === "failed") break;
        await new Promise(resolve => setTimeout(resolve, 700));
      }

      if (!task || (task.state !== "completed" && task.state !== "failed")) {
        throw new Error("Friday task timed out while waiting for the worker.");
      }

      if (task.state === "failed") {
        throw new Error(task.error || "Friday task failed.");
      }

      const result = task.result || {};
      const answer = typeof result.text === "string"
        ? result.text
        : "Friday completed the task, but returned no text response.";

      workingNode.classList.remove("working");
      workingNode.innerHTML = '<span class="label">Friday</span>' + renderText(answer);
      await FridayApi.addMessage(conversationId, "assistant", answer, {
        taskId,
        provider: result.provider,
        model: result.model,
        steps: result.steps
      });

      await refreshHistory();
      setTaskState("Completed", true);
      setStatus("Friday online", "online");
    } catch (error) {
      workingNode.classList.remove("working");
      workingNode.classList.add("error-message");
      workingNode.innerHTML = '<span class="label">Friday</span>' + renderText(error.message);
      setStatus("Connection/error", "error");
      showToast(error.message);
    } finally {
      sending = false;
      setTimeout(() => setTaskState("", false), 3000);
      if (eventAbortController) {
        eventAbortController.abort();
        eventAbortController = null;
      }
      userNode.scrollIntoView({ block: "end", behavior: "smooth" });
    }
  };

  const finishAuth = async result => {
    currentUser = result.user;
    hideAuth();
    setStatus("Friday online", "online");
    $(".profile-name").textContent = currentUser.email;
    $(".profile-subtitle").textContent = "Authenticated workspace";
    await updateConnection();
    await refreshHistory();
    if (currentConversationId) {
      try {
        await loadConversation(currentConversationId);
      } catch {
        currentConversationId = "";
        FridayApi.setConversationId("");
      }
    }
  };

  prompt.addEventListener("input", resize);

  composer.addEventListener("submit", event => {
    event.preventDefault();
    void handleSend();
  });

  document.querySelectorAll("[data-prompt]").forEach(button => {
    button.addEventListener("click", () => {
      prompt.value = button.dataset.prompt;
      resize();
      prompt.focus();
    });
  });

  authForm.addEventListener("submit", async event => {
    event.preventDefault();
    authError.classList.remove("visible");
    authSubmit.disabled = true;
    try {
      const result = authRegisterMode
        ? await FridayApi.register(authEmail.value.trim(), authPassword.value)
        : await FridayApi.login(authEmail.value.trim(), authPassword.value);

      if (authRegisterMode) {
        const loginResult = await FridayApi.login(authEmail.value.trim(), authPassword.value);
        await finishAuth(loginResult);
      } else {
        await finishAuth(result);
      }
      authPassword.value = "";
    } catch (error) {
      authError.textContent = error.message;
      authError.classList.add("visible");
    } finally {
      authSubmit.disabled = false;
    }
  });

  $("#google-auth").addEventListener("click", () => {
    try { FridayApi.startOAuth("google"); } catch (error) { showAuth(error.message); }
  });
  $("#github-auth").addEventListener("click", () => {
    try { FridayApi.startOAuth("github"); } catch (error) { showAuth(error.message); }
  });

  authSwitch.addEventListener("click", () => {
    authRegisterMode = !authRegisterMode;
    authMode.textContent = authRegisterMode ? "Create your Friday account" : "Sign in to Friday";
    authSubmit.textContent = authRegisterMode ? "Create account" : "Sign in";
    authSwitch.textContent = authRegisterMode ? "Already have an account? Sign in" : "Need an account? Create one";
    authError.classList.remove("visible");
  });

  $("#save-settings").addEventListener("click", async () => {
    const value = apiUrlInput.value.trim();
    if (!value) {
      showToast("Enter a backend URL.");
      return;
    }
    FridayApi.setApiBase(value);
    settingsPanel.classList.remove("visible");
    await updateConnection();
    showToast("Backend URL saved.");
  });

  $("#cancel-settings").addEventListener("click", () => settingsPanel.classList.remove("visible"));

  logoutButton.addEventListener("click", async () => {
    if (!FridayApi.getToken()) {
      showAuth();
      return;
    }
    await FridayApi.logout();
    currentUser = null;
    currentConversationId = "";
    resetConversationView();
    showAuth("Signed out. Sign in to continue.");
  });

  document.addEventListener("click", event => {
    const historyItem = event.target.closest("[data-conversation-id]");
    if (historyItem) {
      currentConversationId = historyItem.dataset.conversationId;
      FridayApi.setConversationId(currentConversationId);
      void loadConversation(currentConversationId).catch(error => showToast(error.message));
      sidebar.classList.remove("open");
      return;
    }

    const actionElement = event.target.closest("[data-action]");
    if (!actionElement) return;
    const action = actionElement.dataset.action;

    if (action === "toggle-sidebar") { if (window.matchMedia("(min-width: 801px)").matches) sidebar.closest(".app-shell").classList.toggle("sidebar-collapsed"); else sidebar.classList.toggle("open"); }
    if (action === "reopen-sidebar") sidebar.closest(".app-shell").classList.remove("sidebar-collapsed");

    if (action === "new-chat" || action === "home") {
      currentConversationId = "";
      FridayApi.setConversationId("");
      resetConversationView();
      sidebar.classList.remove("open");
    }

    if (action === "toggle-theme") {
      document.body.classList.toggle("light");
      localStorage.setItem("friday_theme", document.body.classList.contains("light") ? "light" : "dark");
      showToast(document.body.classList.contains("light") ? "Bright mode enabled" : "Dark mode enabled");
    }

    if (action === "attach") fileInput.click();

    if (action === "voice") showToast("Voice input is not connected yet.");

    if (action === "model") showToast("Gemini is the configured backend provider.");

    if (action === "settings") {
      apiUrlInput.value = (FridayApi.getApiBase().replace(/\/api$/, "") || window.location.origin) || window.location.origin;
      settingsPanel.classList.add("visible");
      apiUrlInput.focus();
    }

    if (action === "profile") {
      if (currentUser) showToast(currentUser.email);
      else showAuth();
    }
  });

  fileInput.addEventListener("change", () => {
    const count = fileInput.files.length;
    if (count) showToast(count + " file" + (count > 1 ? "s" : "") + " ready to upload");
  });

  document.addEventListener("keydown", event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      prompt.focus();
    }
    if (event.key === "Escape") {
      sidebar.classList.remove("open");
      settingsPanel.classList.remove("visible");
    }
  });

  if (localStorage.getItem("friday_theme") === "light") document.body.classList.add("light");

  apiUrlInput.value = (FridayApi.getApiBase().replace(/\/api$/, "") || window.location.origin);

  (async () => {
    const params = new URLSearchParams(window.location.search);
    const oauthCode = params.get("oauth_code");
    const oauthError = params.get("oauth_error");
    if (oauthCode) {
      try {
        const result = await FridayApi.exchangeOAuthCode(oauthCode);
        window.history.replaceState({}, document.title, window.location.pathname);
        await finishAuth(result);
        return;
      } catch (error) {
        window.history.replaceState({}, document.title, window.location.pathname);
        showAuth(error.message);
        return;
      }
    }
    if (oauthError) {
      window.history.replaceState({}, document.title, window.location.pathname);
      showAuth(oauthError);
      return;
    }
    if (!FridayApi.getToken()) {
      showAuth();
      return;
    }
    try {
      const result = await FridayApi.me();
      await finishAuth(result);
    } catch {
      await FridayApi.logout();
      showAuth("Your session expired. Please sign in again.");
    }
  })();
})();

/* === Friday operations center controller === */
(() => {
  const shell=document.querySelector(".app-shell");
  const panel=document.getElementById("activity-panel");
  const reopen=document.getElementById("activity-reopen");
  const running=document.getElementById("running-tasks");
  const runningCount=document.getElementById("running-count");
  const taskOverlay=document.getElementById("task-view-overlay");
  const taskLog=document.getElementById("task-log");
  const taskTitle=document.getElementById("task-view-title");
  const taskSubtitle=document.getElementById("task-view-subtitle");
  const taskProgress=document.getElementById("task-progress-bar");
  const taskProgressValue=document.getElementById("task-progress-value");
  const taskFooter=document.getElementById("task-footer-state");
  const taskTool=document.getElementById("task-tool");

  const setActivity=(hidden)=>{
    shell.classList.toggle("activity-hidden",hidden);
    localStorage.setItem("friday_activity_hidden",hidden?"1":"0");
  };

  const renderEmpty=()=>{
    if(!running.children.length){
      running.innerHTML='<div class="activity-empty"><span class="activity-empty-orb"></span><strong>No active tasks</strong><small>Friday will show live work here.</small></div>';
    }
    runningCount.textContent=running.children.length===1 && running.firstElementChild?.classList.contains("activity-empty")?"0":String(running.children.length);
  };

  const openTask=(title="Fix authentication bug",state="Running · GitHub API",progress=68,tool="GitHub API",log="08:13:21  task accepted\n08:13:24  planning execution\n08:13:31  GitHub API → repository\n08:13:38  modifying project files")=>{
    taskTitle.textContent=title; taskSubtitle.textContent=state; taskTool.textContent=tool;
    taskProgress.style.width=Math.max(0,Math.min(100,progress))+"%"; taskProgressValue.textContent=Math.round(progress)+"%";
    taskFooter.textContent=state; taskLog.textContent=log;
    taskOverlay.classList.add("visible"); taskOverlay.setAttribute("aria-hidden","false");
  };
  const closeTask=()=>{taskOverlay.classList.remove("visible");taskOverlay.setAttribute("aria-hidden","true")};

  const updateRunning=(text)=>{
    const normalized=(text||"").toLowerCase();
    if(!text || /completed|failed|connection\/error/.test(normalized)){
      running.innerHTML="";
      renderEmpty();
      return;
    }
    const label=text.replace(/^Task\s+[a-z0-9]+\s*[•·-]\s*/i,"").trim()||"Working";
    let card=document.getElementById("live-task-card");
    if(!card){
      running.innerHTML="";
      card=document.createElement("button");
      card.id="live-task-card"; card.className="activity-task running";
      card.dataset.taskView="live"; running.appendChild(card);
    }
    const busyMatch=label.match(/(\d{1,3})%/);
    const pct=busyMatch?Number(busyMatch[1]):null;
    const clean=label.replace(/\d{1,3}%/,"").trim();
    card.innerHTML='<span class="task-status-icon">●</span><span class="task-copy"><strong>'+escapeActivity(clean||"Working on your request")+'</strong><small>'+(pct===null?"Live execution":pct+"% · Live execution")+'</small>'+(pct===null?"":'<span class="activity-task-progress"><span style="width:'+pct+'%"></span></span>')+'</span><span class="task-arrow">›</span>';
    runningCount.textContent="1";
  };
  const escapeActivity=v=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

  document.addEventListener("click",event=>{
    const toggle=event.target.closest('[data-action="toggle-activity"]');
    if(toggle){event.preventDefault();setActivity(!shell.classList.contains("activity-hidden"));return;}
    const close=event.target.closest('[data-action="close-task-view"]');
    if(close){closeTask();return;}
    const task=event.target.closest("[data-task-view]");
    if(task){
      const type=task.dataset.taskView;
      if(type==="approval") openTask("Deployment approval","Waiting · Approval required",82,"Deployment","Waiting for user approval…");
      else if(type==="ci") openTask("CI failure fixed","Completed · 6/6 steps passed",100,"GitHub Actions","✓ lint\n✓ typecheck\n✓ unit tests\n✓ build\n✓ integration\n✓ deployment check");
      else if(type==="n8n") openTask("Webhook connection","Failed · Retry available",42,"Webhook","POST /webhook → connection refused\nRetry is available.");
      else openTask();
      return;
    }
    const nav=event.target.closest('[data-action="workspace-nav"]');
    if(nav){
      document.querySelectorAll(".nav-item[data-nav]").forEach(n=>n.classList.toggle("active",n===nav));
      const label=(nav.querySelector("span:nth-child(2)")?.textContent||"Workspace");
      if(nav.dataset.nav==="activity") setActivity(false);
      else if(nav.dataset.nav==="tasks") setActivity(false);
      else if(typeof showToast==="function") showToast(label+" workspace is ready for the next phase.");
    }
  });

  const state=document.getElementById("task-state");
  if(state){
    new MutationObserver(()=>updateRunning(state.textContent.trim())).observe(state,{childList:true,characterData:true,subtree:true});
  }

  taskOverlay?.addEventListener("click",e=>{if(e.target===taskOverlay)closeTask()});
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeTask()});

  const emptyStyle=document.createElement("style");
  emptyStyle.textContent='.activity-empty{padding:18px 10px;text-align:center;border:1px dashed var(--line);border-radius:11px;color:var(--dim)}.activity-empty strong{display:block;font-size:9px;color:var(--text);margin-top:8px}.activity-empty small{display:block;font-size:8px;margin-top:4px}.activity-empty-orb{display:block;width:20px;height:20px;margin:auto;border-radius:50%;border:1px solid rgba(var(--mood-rgb),.3);box-shadow:0 0 18px rgba(var(--mood-rgb),.15)}';
  document.head.appendChild(emptyStyle);

  renderEmpty();
  setActivity(localStorage.getItem("friday_activity_hidden")==="1");
})();
