let weightChartInstance = null;
let currentScreen = "home";
let currentChatId = null;
let isVoiceListening = false;
let recognition = null;
let heroSliderInterval = null;
let screenBackgroundIndex = 0;
const API_BASE = "http://localhost:8000";
/* =========================
   BASIC HELPERS
========================= */

function calculateBMI(weight, heightCm) {
  const heightM = heightCm / 100;
  return weight / (heightM * heightM);
}

function getBMICategory(bmi) {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal weight";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

function getTodayKey() {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

function getDayNames() {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
}

function getTodayName() {
  return getDayNames()[new Date().getDay()];
}

function formatDateTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString();
}

function truncateText(text, max = 60) {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "..." : text;
}

function normalizeLanguageSelection(value) {
  const v = String(value || "").trim().toLowerCase();

  if (v === "sinhala" || v === "සිංහල" || v === "sinhalese") return "Sinhala";
  if (v === "tamil" || v === "தமிழ்") return "Tamil";
  return "English";
}

function getActiveLanguage() {
  const chatLanguageSelect = document.getElementById("chatLanguage");
  const settings = loadSettings();
  const memory = getUserMemory();

  const selected = normalizeLanguageSelection(chatLanguageSelect?.value);
  const settingsLang = normalizeLanguageSelection(settings.language);
  const memoryLang = normalizeLanguageSelection(memory?.chatLanguage);

  return selected || settingsLang || memoryLang || "English";
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function showTemporaryPopup(text) {
  const popup = document.createElement("div");
  popup.className = "level-up-popup";
  popup.textContent = text;
  document.body.appendChild(popup);

  setTimeout(() => {
    popup.remove();
  }, 2200);
}

/* =========================
   HERO IMAGE SLIDER
========================= */

function startHeroSlider() {
  const hero = document.getElementById("heroSection");
  if (!hero) return;

  const images = [
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1200&q=80"
  ];

  let index = 0;

  function applyHeroImage() {
    hero.style.backgroundImage = `
      linear-gradient(180deg, rgba(16, 21, 25, 0.08), rgba(16, 21, 25, 0.12)),
      url("${images[index]}")
    `;
    hero.style.backgroundSize = "cover";
    hero.style.backgroundPosition = "center";
    hero.style.backgroundRepeat = "no-repeat";
    index = (index + 1) % images.length;
  }

  applyHeroImage();

  if (heroSliderInterval) {
    clearInterval(heroSliderInterval);
  }

  heroSliderInterval = setInterval(applyHeroImage, 5000);
}
/* =========================
   SCREEN BACKGROUNDS
========================= */

const screenBackgroundImages = [
  "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1599058917765-a780eda07a3e?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1594737625785-a6cbdabd333c?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1558611848-73f7eb4001a1?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1517963879433-6ad2b056d712?auto=format&fit=crop&w=1400&q=80"
];

function applyScreenBackgrounds() {
  const screens = document.querySelectorAll(".screen");
  if (!screens.length) return;

  screens.forEach((screen, i) => {
    const image = screenBackgroundImages[(screenBackgroundIndex + i) % screenBackgroundImages.length];
    screen.style.setProperty("--screen-bg-image", `url("${image}")`);
    screen.style.setProperty("--screen-bg-opacity", "0.95");
    screen.style.setProperty("--screen-bg-position", "center");
    screen.style.setProperty("--screen-bg-size", "cover");
    screen.style.setProperty("--screen-bg-repeat", "no-repeat");
  });
}

function rotateScreenBackgrounds() {
  screenBackgroundIndex = (screenBackgroundIndex + 1) % screenBackgroundImages.length;
  applyScreenBackgrounds();
}

function nextBackground() {
  screenBackgroundIndex = (screenBackgroundIndex + 1) % screenBackgroundImages.length;
  applyScreenBackgrounds();
}

/* =========================
   USER MEMORY
========================= */

function saveUserMemory(data) {
  localStorage.setItem("fitai_user", JSON.stringify(data));
}

function getUserMemory() {
  const data = localStorage.getItem("fitai_user");
  return data ? JSON.parse(data) : null;
}

/* =========================
   SETTINGS
========================= */

function getDefaultSettings() {
  return {
    theme: "light",
    language: "English",
    replyStyle: "balanced",
    voiceEnabled: false,
    autoSaveChats: true,
    dailyReminderEnabled: true,
    soundEnabled: false
  };
}

function loadSettings() {
  const saved = localStorage.getItem("fitai_settings");
  if (!saved) return getDefaultSettings();

  try {
    return { ...getDefaultSettings(), ...JSON.parse(saved) };
  } catch (error) {
    return getDefaultSettings();
  }
}

function saveSettings() {
  const settings = {
    theme: document.getElementById("themeSelect")?.value || "light",
    language: normalizeLanguageSelection(document.getElementById("settingsLanguage")?.value || "English"),
    replyStyle: document.getElementById("replyStyle")?.value || "balanced",
    voiceEnabled: !!document.getElementById("voiceEnabled")?.checked,
    autoSaveChats: !!document.getElementById("autoSaveChats")?.checked,
    dailyReminderEnabled: !!document.getElementById("dailyReminderEnabled")?.checked,
    soundEnabled: !!document.getElementById("soundEnabled")?.checked
  };

  localStorage.setItem("fitai_settings", JSON.stringify(settings));
  applySettings(settings);

  const user = getUserMemory() || {};
  user.chatLanguage = settings.language;
  saveUserMemory(user);

  const chatLanguageSelect = document.getElementById("chatLanguage");
  if (chatLanguageSelect) {
    chatLanguageSelect.value = settings.language;
  }

  renderHomeSummary();
  renderProfileScreen();
  showTemporaryPopup("Settings saved");
}

function applySettings(settings = loadSettings()) {
  document.body.classList.toggle("dark-theme", settings.theme === "dark");

  const themeSelect = document.getElementById("themeSelect");
  const settingsLanguage = document.getElementById("settingsLanguage");
  const replyStyle = document.getElementById("replyStyle");
  const voiceEnabled = document.getElementById("voiceEnabled");
  const autoSaveChats = document.getElementById("autoSaveChats");
  const dailyReminderEnabled = document.getElementById("dailyReminderEnabled");
  const soundEnabled = document.getElementById("soundEnabled");

  if (themeSelect) themeSelect.value = settings.theme;
  if (settingsLanguage) settingsLanguage.value = normalizeLanguageSelection(settings.language);
  if (replyStyle) replyStyle.value = settings.replyStyle;
  if (voiceEnabled) voiceEnabled.checked = settings.voiceEnabled;
  if (autoSaveChats) autoSaveChats.checked = settings.autoSaveChats;
  if (dailyReminderEnabled) dailyReminderEnabled.checked = settings.dailyReminderEnabled;
  if (soundEnabled) soundEnabled.checked = settings.soundEnabled;

  const chatLanguage = document.getElementById("chatLanguage");
  if (chatLanguage) {
    const memory = getUserMemory();
    chatLanguage.value = normalizeLanguageSelection(
      chatLanguage.value || memory?.chatLanguage || settings.language || "English"
    );
  }
}

/* =========================
   COACH MENU
========================= */

function getCoachFrame() {
  return document.querySelector(".phone-frame");
}

function openCoachMenu() {
  const menu = document.getElementById("coachSideMenu");
  const overlay = document.getElementById("coachMenuOverlay");
  const frame = getCoachFrame();

  if (menu) menu.classList.add("open");
  if (overlay) overlay.classList.add("show");
  if (frame) frame.style.overflow = "hidden";

  renderDrawerRecentChats();
}

function closeCoachMenu() {
  const menu = document.getElementById("coachSideMenu");
  const overlay = document.getElementById("coachMenuOverlay");
  const frame = getCoachFrame();

  if (menu) menu.classList.remove("open");
  if (overlay) overlay.classList.remove("show");
  if (frame) frame.style.overflow = "";
}


  function toggleCoachMenu(forceState) {
  const menu = document.getElementById("coachSideMenu");
  if (!menu) return;

  if (typeof forceState === "boolean") {
    if (forceState) {
      openCoachMenu();
    } else {
      closeCoachMenu();
    }
    return;
  }

  if (menu.classList.contains("open")) {
    closeCoachMenu();
  } else {
    openCoachMenu();
  }
}

/* =========================
   PANELS
========================= */

function openGlobalOverlay() {
  const overlay = document.getElementById("globalPanelOverlay");
  if (overlay) overlay.classList.add("show");
}

function closeGlobalOverlay() {
  const overlay = document.getElementById("globalPanelOverlay");
  if (overlay) overlay.classList.remove("show");
}

function closeAllPanels() {
  closeChatHistoryPanel();
  closeSettingsPanel();
  closeVoicePanel();
  closeGlobalOverlay();
}

function openChatHistoryPanel() {
  closeAllPanels();
  const panel = document.getElementById("chatHistoryPanel");
  if (panel) panel.classList.add("open");
  openGlobalOverlay();
  renderChatHistoryList();
}

function closeChatHistoryPanel() {
  const panel = document.getElementById("chatHistoryPanel");
  if (panel) panel.classList.remove("open");
}

function openSettingsPanel() {
  closeAllPanels();
  const panel = document.getElementById("settingsPanel");
  if (panel) panel.classList.add("open");
  openGlobalOverlay();
  applySettings(loadSettings());
}

function closeSettingsPanel() {
  const panel = document.getElementById("settingsPanel");
  if (panel) panel.classList.remove("open");
}

function openVoicePanel() {
  closeAllPanels();
  const panel = document.getElementById("voicePanel");
  if (panel) panel.classList.add("open");
  openGlobalOverlay();
}

function closeVoicePanel() {
  const panel = document.getElementById("voicePanel");
  if (panel) panel.classList.remove("open");
  stopVoiceCoach();
}

/* =========================
   SCREEN NAVIGATION
========================= */

function switchScreen(screenName) {
  currentScreen = screenName;
  applyScreenBackgrounds();

  closeCoachMenu();
  closeAllPanels();

  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("active-screen");
  });

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  const targetScreen = document.getElementById(`screen-${screenName}`);
  const targetBtn = document.querySelector(`.nav-btn[data-screen="${screenName}"]`);

  if (targetScreen) targetScreen.classList.add("active-screen");
  if (targetScreen) {
  targetScreen.querySelectorAll(".card, .mini-stat-card, .summary-item, .message").forEach((el) => {
    el.classList.remove("iphone-animate-in");
    void el.offsetWidth;
    el.classList.add("iphone-animate-in");
  });
}
  if (targetBtn) targetBtn.classList.add("active");

  if (screenName === "progress") {
    renderWeightChart();
    renderGamification();
  }

  if (screenName === "profile") {
    renderProfileScreen();
  }

  if (screenName === "home") {
    renderHomeSummary();
    renderCheckInUI();
    renderNutritionUI();
    renderWeeklyPlanner();
    renderReminder();
  }

  if (screenName === "coach") {
    renderChatHistoryList();
    updateActiveChatTitle();
  }
}

function handleMenuClick(action) {
  closeCoachMenu();

  switch (action) {
    case "chat":
      switchScreen("coach");
      openChatHistoryPanel();
      break;

    case "settings":
      openSettingsPanel();
      break;

    case "progress":
      switchScreen("progress");
      break;

    case "profile":
      switchScreen("profile");
      break;

    case "voice":
      switchScreen("coach");
      openVoicePanel();
      break;

    default:
      console.log("Unknown menu action");
  }
}

/* =========================
   CHAT HISTORY
========================= */

function loadChatSessions() {
  const saved = localStorage.getItem("fitai_chat_sessions");
  if (!saved) return [];

  try {
    return JSON.parse(saved);
  } catch (error) {
    return [];
  }
}

function saveChatSessions(sessions) {
  localStorage.setItem("fitai_chat_sessions", JSON.stringify(sessions));
}

function createChatTitleFromMessage(message) {
  return truncateText(message.replace(/\s+/g, " ").trim(), 38) || "New Chat";
}

function getCurrentChatSession() {
  const sessions = loadChatSessions();
  return sessions.find((session) => session.id === currentChatId) || null;
}

function ensureCurrentChatSession() {
  let sessions = loadChatSessions();

  if (currentChatId) {
    const existing = sessions.find((session) => session.id === currentChatId);
    if (existing) return existing;
  }

  const newSession = {
    id: `chat_${Date.now()}`,
    title: "New Chat",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: []
  };

  sessions.unshift(newSession);
  saveChatSessions(sessions);
  currentChatId = newSession.id;
  localStorage.setItem("fitai_current_chat_id", currentChatId);
  updateActiveChatTitle();
  renderChatHistoryList();
  renderDrawerRecentChats();
  return newSession;
}

function startNewChat() {
  const sessions = loadChatSessions();
  const newSession = {
    id: `chat_${Date.now()}`,
    title: "New Chat",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: []
  };

  sessions.unshift(newSession);
  saveChatSessions(sessions);

  currentChatId = newSession.id;
  localStorage.setItem("fitai_current_chat_id", currentChatId);

  const chatBox = document.getElementById("chat-box");
  if (chatBox) {
    chatBox.innerHTML = "";
    chatBox.classList.remove("hidden-chat");
    chatBox.classList.add("show-chat");
  }

  const welcome = document.getElementById("chatWelcomeState");
  if (welcome) welcome.style.display = "block";

  updateActiveChatTitle();
  renderChatHistoryList();
  renderDrawerRecentChats();
  closeCoachMenu();
}

function saveMessageToCurrentChat(role, content, renderedHtml = "") {
  const settings = loadSettings();
  if (!settings.autoSaveChats) return;

  const sessions = loadChatSessions();
  let sessionIndex = sessions.findIndex((session) => session.id === currentChatId);

  if (sessionIndex === -1) {
    ensureCurrentChatSession();
    return saveMessageToCurrentChat(role, content, renderedHtml);
  }

  const session = sessions[sessionIndex];

  session.messages.push({
    role,
    content,
    renderedHtml,
    createdAt: new Date().toISOString()
  });

  if (session.title === "New Chat" && role === "user" && content) {
    session.title = createChatTitleFromMessage(content);
  }

  session.updatedAt = new Date().toISOString();

  sessions.splice(sessionIndex, 1);
  sessions.unshift(session);

  saveChatSessions(sessions);
  currentChatId = session.id;
  localStorage.setItem("fitai_current_chat_id", currentChatId);

  updateActiveChatTitle();
  renderChatHistoryList();
  renderDrawerRecentChats();
}

function renderChatHistoryList() {
  const list = document.getElementById("chatHistoryList");
  if (!list) return;

  const sessions = loadChatSessions();

  if (!sessions.length) {
    list.innerHTML = `<div class="empty-panel-state">No previous chats yet.</div>`;
    return;
  }

  list.innerHTML = sessions.map((session) => {
    const lastMessage = session.messages?.length
      ? session.messages[session.messages.length - 1].content
      : "No messages yet";

    return `
      <div class="chat-history-item ${session.id === currentChatId ? "active" : ""}" onclick="loadChatSession('${session.id}')">
        <div class="chat-history-top">
          <div class="chat-history-title">${escapeHtml(session.title || "New Chat")}</div>
          <div class="chat-history-date">${new Date(session.updatedAt).toLocaleDateString()}</div>
        </div>
        <div class="chat-history-preview">${escapeHtml(truncateText(lastMessage, 64))}</div>
        <div class="chat-history-actions">
          <button type="button" class="history-delete-btn" onclick="deleteChatSession(event, '${session.id}')">Delete</button>
        </div>
      </div>
    `;
  }).join("");
}

function renderDrawerRecentChats() {
  const list = document.getElementById("drawerRecentChats");
  if (!list) return;

  const sessions = loadChatSessions();

  if (!sessions.length) {
    list.innerHTML = `<div class="drawer-empty-state">No recent chats</div>`;
    return;
  }

  list.innerHTML = sessions.slice(0, 6).map((session) => {
  const lastMessage = session.messages?.length
    ? session.messages[session.messages.length - 1].content
    : "";

  return `
    <button type="button" 
      class="drawer-recent-item ${session.id === currentChatId ? "active" : ""}" 
      onclick="loadChatSessionFromDrawer('${session.id}')">

      <div style="font-weight:700;font-size:13px;">
        ${escapeHtml(truncateText(session.title || "New Chat", 30))}
      </div>

      <div style="font-size:11px;opacity:0.6;margin-top:2px;">
        ${escapeHtml(truncateText(lastMessage, 40))}
      </div>

    </button>
  `;
}).join("");
}

function loadChatSessionFromDrawer(chatId) {
  loadChatSession(chatId);
  switchScreen("coach");
  closeCoachMenu();
}

function loadChatSession(chatId) {
  const sessions = loadChatSessions();
  const session = sessions.find((item) => item.id === chatId);
  if (!session) return;

  currentChatId = chatId;
  localStorage.setItem("fitai_current_chat_id", currentChatId);

  const chatBox = document.getElementById("chat-box");
  if (!chatBox) return;

  chatBox.innerHTML = "";
  chatBox.classList.remove("hidden-chat");
  chatBox.classList.add("show-chat");

  const welcome = document.getElementById("chatWelcomeState");
  if (welcome) {
    welcome.style.display = session.messages.length ? "none" : "block";
  }

  session.messages.forEach((msg) => {
    if (msg.role === "user") {
      chatBox.appendChild(createUserMessage(msg.content));
    } else {
      const botDiv = createBotMessage(msg.renderedHtml || formatReply(msg.content));
      chatBox.appendChild(botDiv);
    }
  });

  chatBox.scrollTop = chatBox.scrollHeight;
  updateActiveChatTitle();
  renderChatHistoryList();
  renderDrawerRecentChats();
  closeChatHistoryPanel();
  closeGlobalOverlay();
}

function deleteChatSession(event, chatId) {
  event.stopPropagation();

  let sessions = loadChatSessions();
  sessions = sessions.filter((item) => item.id !== chatId);
  saveChatSessions(sessions);

  if (currentChatId === chatId) {
    currentChatId = sessions.length ? sessions[0].id : null;
    localStorage.setItem("fitai_current_chat_id", currentChatId || "");
    const chatBox = document.getElementById("chat-box");
    if (chatBox) chatBox.innerHTML = "";

    if (currentChatId) {
      loadChatSession(currentChatId);
    } else {
      updateActiveChatTitle();
      const welcome = document.getElementById("chatWelcomeState");
      if (welcome) welcome.style.display = "block";
    }
  }

  renderChatHistoryList();
  renderDrawerRecentChats();
}

function clearAllChats() {
  localStorage.removeItem("fitai_chat_sessions");
  localStorage.removeItem("fitai_current_chat_id");
  currentChatId = null;

  const chatBox = document.getElementById("chat-box");
  if (chatBox) chatBox.innerHTML = "";

  const welcome = document.getElementById("chatWelcomeState");
  if (welcome) welcome.style.display = "block";

  updateActiveChatTitle();
  renderChatHistoryList();
  renderDrawerRecentChats();
}

function updateActiveChatTitle() {
  const titleEl = document.getElementById("activeChatTitle");
  if (!titleEl) return;

  const current = getCurrentChatSession();
  titleEl.textContent = current?.title || "New Chat";
}

/* =========================
   CHAT UI
========================= */

function showChatBox() {
  const chatBox = document.getElementById("chat-box");
  if (!chatBox) return;

  if (chatBox.classList.contains("hidden-chat")) {
    chatBox.classList.remove("hidden-chat");
    chatBox.classList.add("show-chat");
  }

  const welcome = document.getElementById("chatWelcomeState");
  if (welcome) welcome.style.display = "none";
}

function createUserMessage(text) {
  const userDiv = document.createElement("div");
  userDiv.className = "message user premium-user";
  userDiv.innerText = text;
  return userDiv;
}

function createBotMessage(htmlText) {
  const botDiv = document.createElement("div");
 botDiv.className = "message bot premium-bot";
  botDiv.innerHTML = htmlText;
  return botDiv;
}

function createLoadingMessage() {
  return createBotMessage(`
    <div>
      <strong>AI Coach is analyzing your data</strong>
      <div class="typing">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div class="shimmer-wrap" style="margin-top: 12px;">
        <div class="shimmer-line long"></div>
        <div class="shimmer-line mid"></div>
        <div class="shimmer-line short"></div>
        <div class="shimmer-line long"></div>
      </div>
    </div>
  `);
}

function autoNextStep() {
  const input = document.getElementById("message");
  if (!input) return;
  input.value = "Give me a more advanced plan based on my current plan";
  sendMessage();
}

function setSuggestionMessage(text) {
  const input = document.getElementById("message");
  if (!input) return;
  input.value = text;
  sendMessage();
}

function formatReply(text) {
  if (!text) return "";

  // 🔹 keep original safe
  let safe = text;

  // 🔹 bold (**text**)
  safe = safe.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // 🔹 emojis → new lines
  safe = safe.replace(/(🧠|🏋️|🥗|💧|⏳|🔥|📌|⚠️|✨|➡️)/g, "<br><br>$1");

  // 🔹 line breaks
  safe = safe.replace(/\n/g, "<br>");

  return `
    <div style="
      line-height:1.7;
      font-size:15px;
      padding:14px;
      border-radius:16px;
      background:rgba(255,255,255,0.05);
      backdrop-filter: blur(10px);
    ">
      ${safe}
    </div>
  `;
}
/* =========================
   STREAK SYSTEM
========================= */

function getStreakData() {
  const data = localStorage.getItem("fitai_streak");
  return data ? JSON.parse(data) : { count: 0, lastDate: null };
}

function updateStreak() {
  const today = getTodayKey();
  let streak = getStreakData();

  if (!streak.lastDate) {
    streak = { count: 1, lastDate: today };
  } else {
    const last = new Date(streak.lastDate);
    const now = new Date(today);
    const diff = (now - last) / (1000 * 60 * 60 * 24);

    if (diff === 1) {
      streak.count += 1;
    } else if (diff > 1) {
      streak.count = 1;
    }

    streak.lastDate = today;
  }

  localStorage.setItem("fitai_streak", JSON.stringify(streak));
  renderStreak();
}

function renderStreak() {
  const streak = getStreakData();
  const el = document.getElementById("topStreakBadge");
  const homeEl = document.getElementById("homeStreakStat");

  if (el) el.innerText = `🔥 Day ${streak.count}`;
  if (homeEl) homeEl.innerText = streak.count;
}

/* =========================
   CHECK-IN SYSTEM
========================= */

function analyzeCheckIn() {
  const sleep = Number(document.getElementById("sleepHours")?.value || 0);
  const mood = document.getElementById("moodSelect")?.value;
  const energy = Number(document.getElementById("energyLevel")?.value || 0);
  const soreness = Number(document.getElementById("sorenessLevel")?.value || 0);
  const motivation = Number(document.getElementById("motivationLevel")?.value || 0);

  if (!sleep || !mood || !energy || !soreness || !motivation) {
    alert("Please fill all Today Check-In fields");
    return;
  }

  let result = "Moderate Training Day 💪";
  let tips = [];

  if (sleep < 5 || energy <= 3 || soreness >= 8) {
    result = "Recovery Day 🧘";
    tips.push("Focus on light stretching");
    tips.push("Drink more water");
    tips.push("Sleep early");
    tips.push("Avoid very hard training today");
  } else if (energy >= 8 && motivation >= 8 && soreness <= 5) {
    result = "High Performance Day 🚀";
    tips.push("Push harder in workout");
    tips.push("Increase intensity");
    tips.push("Add one extra set if form is good");
    tips.push("Take enough protein after training");
  } else {
    tips.push("Stay consistent");
    tips.push("Maintain normal workout");
    tips.push("Focus on quality reps");
    tips.push("Recover properly after training");
  }

  const box = document.getElementById("checkinResult");
  if (!box) return;

  box.classList.remove("hidden-checkin");
  box.innerHTML = `
    <div class="checkin-badge">${result}</div>
    <h4>Your Day Analysis</h4>
    <p>${mood || "Normal mood"} day detected.</p>
    <div class="checkin-tips">
      ${tips.map(t => `<div class="checkin-tip">${t}</div>`).join("")}
    </div>
  `;

  localStorage.setItem("fitai_checkin", JSON.stringify({
    sleep,
    mood,
    energy,
    soreness,
    motivation,
    result,
    tips,
    date: getTodayKey()
  }));

  renderProfileScreen();
}

function renderCheckInUI() {
  const data = JSON.parse(localStorage.getItem("fitai_checkin") || "{}");
  const box = document.getElementById("checkinResult");
  if (!box) return;

  if (!data.result) {
    box.classList.add("hidden-checkin");
    box.innerHTML = "";
    return;
  }

  box.classList.remove("hidden-checkin");
  box.innerHTML = `
    <div class="checkin-badge">${data.result}</div>
    <h4>Your Day Analysis</h4>
    <p>${data.mood || "Normal mood"} day detected.</p>
    <div class="checkin-tips">
      ${(data.tips || []).map(t => `<div class="checkin-tip">${t}</div>`).join("")}
    </div>
  `;

  const sleepInput = document.getElementById("sleepHours");
  const moodSelect = document.getElementById("moodSelect");
  const energySelect = document.getElementById("energyLevel");
  const sorenessSelect = document.getElementById("sorenessLevel");
  const motivationSelect = document.getElementById("motivationLevel");

  if (sleepInput) sleepInput.value = data.sleep || "";
  if (moodSelect) moodSelect.value = data.mood || "";
  if (energySelect) energySelect.value = data.energy || "";
  if (sorenessSelect) sorenessSelect.value = data.soreness || "";
  if (motivationSelect) motivationSelect.value = data.motivation || "";
}

/* =========================
   NUTRITION + WATER
========================= */

function getNutrition() {
  return JSON.parse(localStorage.getItem("fitai_nutrition") || "{}");
}

function saveNutrition(data) {
  localStorage.setItem("fitai_nutrition", JSON.stringify(data));
}

function updateWaterTarget() {
  const target = Number(document.getElementById("waterTarget")?.value || 3000);
  const data = getNutrition();
  data.target = target;
  saveNutrition(data);
  renderNutritionUI();
}

function addWater(amount) {
  const data = getNutrition();
  data.current = (data.current || 0) + amount;
  saveNutrition(data);
  renderNutritionUI();
}

function resetWater() {
  const data = getNutrition();
  data.current = 0;
  saveNutrition(data);
  renderNutritionUI();
}

function toggleMealState(meal) {
  const data = getNutrition();
  data[meal] = !data[meal];
  saveNutrition(data);
  renderNutritionUI();
}

function renderNutritionUI() {
  const data = getNutrition();
  const current = data.current || 0;
  const target = data.target || 3000;
  const percent = Math.min(100, (current / target) * 100);

  const fill = document.getElementById("waterFill");
  const text = document.getElementById("waterProgressText");
  const percentText = document.getElementById("waterPercentText");
  const waterTargetInput = document.getElementById("waterTarget");

  if (fill) fill.style.width = percent + "%";
  if (text) text.innerText = `${current} / ${target} ml`;
  if (percentText) percentText.innerText = `${Math.round(percent)}%`;
  if (waterTargetInput) waterTargetInput.value = target;

  const breakfast = document.getElementById("mealBreakfast");
  const lunch = document.getElementById("mealLunch");
  const dinner = document.getElementById("mealDinner");
  const snack = document.getElementById("mealSnack");

  if (breakfast) breakfast.checked = !!data.breakfast;
  if (lunch) lunch.checked = !!data.lunch;
  if (dinner) dinner.checked = !!data.dinner;
  if (snack) snack.checked = !!data.snack;

  const status = document.getElementById("nutritionStatus");
  if (status) {
    const mealCount = [data.breakfast, data.lunch, data.dinner, data.snack].filter(Boolean).length;

    if (percent >= 100 && mealCount >= 3) {
      status.innerText = "Excellent job. Hydration and meals look strong today 💧";
    } else if (percent >= 100) {
      status.innerText = "Perfect hydration achieved 💧 Keep meals consistent too.";
    } else {
      status.innerText = "Keep drinking water and stay consistent with meals.";
    }
  }

  renderProfileScreen();
}

/* =========================
   WEEKLY PLANNER
========================= */

function renderWeeklyPlanner() {
  const container = document.getElementById("weeklyPlanner");
  if (!container) return;

  const days = getDayNames();
  const today = getTodayName();

  container.innerHTML = days.map(day => `
    <div class="week-day-card ${day === today ? "today" : ""}">
      <div class="week-day-top">
        <span class="week-day-name">${day}</span>
        <span class="week-day-badge">${day === today ? "Today" : ""}</span>
      </div>
      <div class="week-day-focus">Workout / Recovery</div>
      <div class="week-day-desc">Stay consistent with your plan and recover smart.</div>
    </div>
  `).join("");
}

/* =========================
   REMINDER
========================= */

function saveReminder() {
  const time = document.getElementById("reminderTime")?.value;
  localStorage.setItem("fitai_reminder", time || "");
  renderReminder();
  showTemporaryPopup("Reminder saved");
}

function renderReminder() {
  const time = localStorage.getItem("fitai_reminder");
  const el = document.getElementById("reminderStatus");
  const reminderInput = document.getElementById("reminderTime");

  if (reminderInput && time) {
    reminderInput.value = time;
  }

  if (el) {
    el.innerText = time ? `Reminder set at ${time}` : "No reminder set";
  }
}

/* =========================
   IMAGE UPLOAD
========================= */

function setupImagePreview(inputId, previewId, fileNameId, removeBtnId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const fileName = document.getElementById(fileNameId);
  const removeBtn = document.getElementById(removeBtnId);

  if (!input) return;

  input.addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      if (preview) {
        preview.src = e.target.result;
        preview.style.display = "block";
      }
      if (fileName) fileName.innerText = file.name;
      if (removeBtn) removeBtn.style.display = "flex";
    };
    reader.readAsDataURL(file);
  });
}

function removeImage(inputId, previewId, fileNameId, removeBtnId, e) {
  if (e) e.stopPropagation();

  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const fileName = document.getElementById(fileNameId);
  const removeBtn = document.getElementById(removeBtnId);

  if (input) input.value = "";
  if (preview) {
    preview.src = "";
    preview.style.display = "none";
  }
  if (fileName) fileName.innerText = "";
  if (removeBtn) removeBtn.style.display = "none";
}

/* =========================
   WEIGHT TRACKING
========================= */

function saveWeight(weight) {
  if (!weight || Number.isNaN(weight)) return;

  let history = JSON.parse(localStorage.getItem("fitai_weight") || "[]");
  history.push({ date: getTodayKey(), weight });
  localStorage.setItem("fitai_weight", JSON.stringify(history));
}

function renderWeightChart() {
  const history = JSON.parse(localStorage.getItem("fitai_weight") || "[]");
  const chartWrap = document.getElementById("chart-wrap");

  if (!chartWrap) return;

  if (!history.length) {
    chartWrap.style.display = "block";
    chartWrap.innerHTML = `
      <div class="empty-chart-state">
        No weight data yet.<br>
        Generate your plan or save your weight to see progress.
      </div>
    `;

    if (weightChartInstance) {
      weightChartInstance.destroy();
      weightChartInstance = null;
    }

    return;
  }

  chartWrap.style.display = "block";
  chartWrap.innerHTML = `<canvas id="weightChart"></canvas>`;

  const ctx = document.getElementById("weightChart");
  if (!ctx) return;

  if (weightChartInstance) {
    weightChartInstance.destroy();
  }

  weightChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: history.map(h => h.date),
      datasets: [
        {
          label: "Weight",
          data: history.map(h => h.weight),
          tension: 0.35,
          fill: false,
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true
        }
      },
      scales: {
        y: {
          beginAtZero: false
        }
      }
    }
  });
}

/* =========================
   GAMIFICATION
========================= */

function getXPData() {
  return JSON.parse(localStorage.getItem("fitai_xp") || '{"xp":0,"level":1}');
}

function saveXPData(data) {
  localStorage.setItem("fitai_xp", JSON.stringify(data));
}

function addXP(amount) {
  let data = getXPData();
  data.xp += amount;

  if (data.xp >= 100) {
    data.level += 1;
    data.xp = data.xp - 100;
    showTemporaryPopup("Level Up 🚀");
  }

  saveXPData(data);
  renderGamification();
}

function renderGamification() {
  const data = getXPData();

  const progressLevelStat = document.getElementById("progressLevelStat");
  const progressXPStat = document.getElementById("progressXPStat");
  const levelText = document.getElementById("levelText");
  const levelXPText = document.getElementById("levelXPText");
  const fill = document.getElementById("xpFill");

  if (progressLevelStat) progressLevelStat.innerText = data.level;
  if (progressXPStat) progressXPStat.innerText = `${data.xp} / 100`;
  if (levelText) levelText.innerText = `Level ${data.level}`;
  if (levelXPText) levelXPText.innerText = `${data.xp} / 100 XP`;

  if (fill) {
    const percent = Math.min(100, (data.xp / 100) * 100);
    fill.style.width = percent + "%";
    fill.style.transition = "width 0.5s ease";
  }

  renderHomeSummary();
  updateBadges();
}
/* =========================
   PLAN GENERATION
========================= */
function generatePlan() {
  const chatBox = document.getElementById("chat-box");
  const welcome = document.getElementById("chatWelcomeState");

  const name = document.getElementById("name")?.value?.trim();
  const age = document.getElementById("age")?.value?.trim();
  const weight = document.getElementById("weight")?.value?.trim();
  const height = document.getElementById("height")?.value?.trim();
  const gender = document.getElementById("gender")?.value;
  const workoutPlace = document.getElementById("workoutPlace")?.value;
  const goal = document.getElementById("goal")?.value;
  const language = getActiveLanguage();

  if (!name || !age || !weight || !height || !gender || !workoutPlace || !goal) {
    alert("Please fill all details first");
    return;
  }

  const bmiValue = calculateBMI(Number(weight), Number(height));
  const bmi = bmiValue.toFixed(1);
  const bmiCategory = getBMICategory(Number(bmi));

  const userMemory = {
    name,
    age,
    weight,
    height,
    gender,
    workoutPlace,
    workout: workoutPlace,
    goal,
    chatLanguage: language,
    bmi,
    bmiCategory
  };

  saveUserMemory(userMemory);
  saveWeight(Number(weight));
  updateStreak();

  const prompt = `
You are FitAI Coach, a premium AI fitness coach.

IMPORTANT:
- Reply ONLY in ${language}
- Never add hashtags
- Use clear headings with emojis
- Make important notes stand out clearly
- Explain more deeply so the user can fully understand
- Use short paragraphs
- Make the answer attractive and easy to read

User details:
- Name: ${name}
- Age: ${age}
- Weight: ${weight} kg
- Height: ${height} cm
- Gender: ${gender}
- Workout Place: ${workoutPlace}
- Goal: ${goal}
- BMI: ${bmi} (${bmiCategory})

${getCoachPersonalityText()}

Use this structure exactly:

🧠 Body Analysis:
🏋️ Workout Plan:
🥗 Food Advice:
💧 Daily Nutrition:
⏳ Timeline:
✨ Recovery Tips:
📌 Important Note:
🔥 Motivation:
➡️ Next Step:

Do not use hashtags.
Do not make the reply messy.
`.trim();

  switchScreen("coach");
  showChatBox();
  ensureCurrentChatSession();

  if (welcome) welcome.style.display = "none";
  if (!chatBox) return;

  const userText = `Generate my full fitness plan. My goal is ${goal}.`;
  chatBox.appendChild(createUserMessage(userText));
  saveMessageToCurrentChat("user", userText);

  const loading = createLoadingMessage();
  chatBox.appendChild(loading);
  chatBox.scrollTop = chatBox.scrollHeight;

  fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message: prompt })
  })
    .then(res => res.json())
    .then(data => {
      loading.remove();

      const reply = data.reply || "No reply received.";
      const formatted = formatReply(reply);

      const botMessage = createBotMessage(formatted);
      chatBox.appendChild(botMessage);

      const buttonWrap = document.createElement("div");
      buttonWrap.className = "message bot premium-bot";
      buttonWrap.innerHTML = `
        <div style="margin-top: 8px;">
          <button type="button" class="primary-btn" onclick="switchScreen('routine')">
            Open My Workout Animations
          </button>
        </div>
      `;
      chatBox.appendChild(buttonWrap);

      saveMessageToCurrentChat("bot", reply, formatted);
      chatBox.scrollTop = chatBox.scrollHeight;

      renderHomeSummary();
      renderProfileScreen();
      renderWeightChart();
      renderGamification();
      renderDrawerRecentChats();
    })
    .catch((error) => {
  alert(error.message);
      loading.remove();
      const botMessage = createBotMessage("Backend error. Please make sure FastAPI server is running.");
      chatBox.appendChild(botMessage);
      chatBox.scrollTop = chatBox.scrollHeight;
    });

  generateRoutineFromPlan();
}

/* =========================
   AI CHAT
========================= */

async function sendMessage() {
  const input = document.getElementById("message");
  const chatBox = document.getElementById("chat-box");
  if (!input || !chatBox) return;

  const message = input.value.trim();
  if (!message) return;

  ensureCurrentChatSession();
  showChatBox();

  const userDiv = createUserMessage(message);
  chatBox.appendChild(userDiv);
  saveMessageToCurrentChat("user", message);

  input.value = "";
  chatBox.scrollTop = chatBox.scrollHeight;

  const memory = getUserMemory() || {};
  const language = getActiveLanguage();
  const checkin = JSON.parse(localStorage.getItem("fitai_checkin") || "{}");
  const nutrition = getNutrition();

  const prompt = `
You are FitAI Coach, a premium AI personal fitness coach.

IMPORTANT:
- Reply ONLY in ${language}
- Never use hashtags
- Use emojis and headings
- Make the answer attractive and easy to read
- Explain more deeply so the user can fully understand
- Highlight important warnings and important notes clearly

User profile:
- Name: ${memory.name || "User"}
- Age: ${memory.age || "Unknown"}
- Weight: ${memory.weight || "Unknown"}
- Height: ${memory.height || "Unknown"}
- Gender: ${memory.gender || "Unknown"}
- Goal: ${memory.goal || "General Fitness"}
- Workout Place: ${memory.workoutPlace || memory.workout || "Unknown"}
- BMI: ${memory.bmi || "Unknown"}
- BMI Category: ${memory.bmiCategory || "Unknown"}

Latest Check-In:
- Sleep: ${checkin.sleep || "Unknown"}
- Mood: ${checkin.mood || "Unknown"}
- Energy: ${checkin.energy || "Unknown"}
- Soreness: ${checkin.soreness || "Unknown"}
- Motivation: ${checkin.motivation || "Unknown"}
- Result: ${checkin.result || "Unknown"}

Nutrition:
- Water: ${nutrition.current || 0} / ${nutrition.target || 3000}
- Breakfast: ${nutrition.breakfast ? "Done" : "Not done"}
- Lunch: ${nutrition.lunch ? "Done" : "Not done"}
- Dinner: ${nutrition.dinner ? "Done" : "Not done"}
- Snack: ${nutrition.snack ? "Done" : "Not done"}

${getCoachPersonalityText()}

User message:
${message}

Use headings like:
🧠 Explanation:
💪 What To Do:
🥗 Food:
📌 Important:
⚠️ Warning:
🚀 Next Step:

Do not use hashtags.
`.trim();

  const loading = createLoadingMessage();
  chatBox.appendChild(loading);
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
   const response = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message: prompt })
    });

    const data = await response.json();
    loading.remove();

    const reply = data.reply || "No reply received.";
    const formatted = formatReply(reply);
    const botDiv = createBotMessage(formatted);

    chatBox.appendChild(botDiv);
    saveMessageToCurrentChat("bot", reply, formatted);

    chatBox.scrollTop = chatBox.scrollHeight;
    updateStreak();
    renderStreak();
    renderDrawerRecentChats();
  } catch (error) {
    loading.remove();
    const errorDiv = createBotMessage("Backend error. Please make sure FastAPI server is running.");
    chatBox.appendChild(errorDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}
/* =========================
   COACH PERSONALITY
========================= */

function getCoachPersonalityText() {
  const memory = getUserMemory();
  const settings = loadSettings();
  const streak = getStreakData();
  const checkin = JSON.parse(localStorage.getItem("fitai_checkin") || "{}");

  const name = memory?.name || "Athlete";

  let moodLine = "";
  if (checkin.result) {
    moodLine = `Latest readiness state: ${checkin.result}`;
  }

  let streakLine = "";
  if (streak.count >= 5) {
    streakLine = `The user has a ${streak.count} day streak. Encourage consistency strongly.`;
  } else if (streak.count > 0) {
    streakLine = `The user is currently on day ${streak.count}.`;
  } else {
    streakLine = `Encourage the user to begin consistency from today.`;
  }

  let styleLine = "Be balanced, helpful, clear, and motivating.";
  if (settings.replyStyle === "strict") styleLine = "Be slightly stricter and disciplined.";
  if (settings.replyStyle === "friendly") styleLine = "Be warm, friendly, and encouraging.";
  if (settings.replyStyle === "motivational") styleLine = "Be highly motivational and emotionally energizing.";

  return `
Use the user's name naturally: ${name}
${moodLine}
${streakLine}
${styleLine}

Tone rules:
- Talk like a caring personal trainer
- Be practical, not vague
- Use short sections when useful
- Make the answer feel premium and personal
  `.trim();
}

/* =========================
   VOICE COACH
========================= */

function getSpeechRecognitionClass() {
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

function getVoiceLanguageCode() {
  const active = getActiveLanguage();

  if (active === "Sinhala") return "si-LK";
  if (active === "Tamil") return "ta-LK";
  return "en-US";
}

function toggleVoiceCoach() {
  if (isVoiceListening) {
    stopVoiceCoach();
  } else {
    startVoiceCoach();
  }
}

function startVoiceCoach() {
  const SpeechRecognitionClass = getSpeechRecognitionClass();
  const statusEl = document.getElementById("voiceCoachStatus");
  const micBtn = document.getElementById("voiceMicBtn");

  if (!SpeechRecognitionClass) {
    if (statusEl) statusEl.innerText = "Voice recognition is not supported in this browser.";
    return;
  }

  recognition = new SpeechRecognitionClass();
  recognition.lang = getVoiceLanguageCode();
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isVoiceListening = true;
    if (statusEl) statusEl.innerText = "Listening...";
    if (micBtn) micBtn.style.transform = "scale(1.06)";
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript || "";
    const input = document.getElementById("message");
    if (input) {
      input.value = transcript;
    }

    if (statusEl) statusEl.innerText = `Heard: ${transcript}`;
    stopVoiceCoach();

    if (transcript.trim()) {
      sendMessage();
    }
  };

  recognition.onerror = () => {
    if (statusEl) statusEl.innerText = "Voice recognition error.";
    stopVoiceCoach();
  };

  recognition.onend = () => {
    isVoiceListening = false;
    if (micBtn) micBtn.style.transform = "";
    if (statusEl && statusEl.innerText === "Listening...") {
      statusEl.innerText = "Voice coach stopped.";
    }
  };

  recognition.start();
}

function stopVoiceCoach() {
  const statusEl = document.getElementById("voiceCoachStatus");
  const micBtn = document.getElementById("voiceMicBtn");

  if (recognition) {
    try {
      recognition.stop();
    } catch (e) {
      // ignore
    }
  }

  isVoiceListening = false;
  if (micBtn) micBtn.style.transform = "";
  if (statusEl) statusEl.innerText = "Voice coach is ready.";
}

/* =========================
   PROFILE
========================= */

function renderProfileScreen() {
  const memory = getUserMemory() || {};
  const checkin = JSON.parse(localStorage.getItem("fitai_checkin") || "{}");
  const nutrition = getNutrition();

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.innerText = value ?? "-";
  };

  setText("profileName", memory.name || "Your Profile");
  setText(
    "profileSub",
    memory.goal
      ? `${memory.goal} • ${memory.workoutPlace || memory.workout || "Workout not set"}`
      : "Fill your details in Coach screen"
  );

  setText("profileAge", memory.age || "-");
  setText("profileWeight", memory.weight ? `${memory.weight} kg` : "-");
  setText("profileHeight", memory.height ? `${memory.height} cm` : "-");
  setText("profileGender", memory.gender || "-");
  setText("profileGoal", memory.goal || "-");
  setText("profileWorkout", memory.workoutPlace || memory.workout || "-");
  setText("profileBMI", memory.bmi ? `${memory.bmi} (${memory.bmiCategory || ""})` : "-");
  setText("profileLanguage", memory.chatLanguage || getActiveLanguage());

  setText("profileSleep", checkin.sleep || "-");
  setText("profileEnergy", checkin.energy || "-");
  setText("profileSoreness", checkin.soreness || "-");
  setText("profileMotivation", checkin.motivation || "-");
  setText("profileMood", checkin.mood || "-");
  setText("profileTrainingType", checkin.result || "-");

  const nutritionStatus = document.getElementById("profileNutritionStatus");
  if (nutritionStatus) {
    nutritionStatus.innerHTML = `
      Water: ${nutrition.current || 0} / ${nutrition.target || 3000} ml<br>
      Breakfast: ${nutrition.breakfast ? "Done" : "Not done"}<br>
      Lunch: ${nutrition.lunch ? "Done" : "Not done"}<br>
      Dinner: ${nutrition.dinner ? "Done" : "Not done"}<br>
      Snack: ${nutrition.snack ? "Done" : "Not done"}
    `;
  }
}

/* =========================
   HOME SUMMARY
========================= */

function setGoal(goal) {
  const goalSelect = document.getElementById("goal");
  if (goalSelect) {
    goalSelect.value = goal;
  }

  const memory = getUserMemory() || {};
  memory.goal = goal;
  saveUserMemory(memory);

  renderHomeSummary();
  renderProfileScreen();
}

function renderHomeSummary() {
  const memory = getUserMemory() || {};
  const xpData = getXPData();
  const streak = getStreakData();

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
  };

  setText("homeNameValue", memory.name || "Not set");
  setText("homeGoalValue", memory.goal || "Not set");
  setText("homeWorkoutValue", memory.workoutPlace || memory.workout || "Not set");
  setText("homeLanguageValue", memory.chatLanguage || getActiveLanguage());

  setText("homeLevelStat", xpData.level || 1);
  setText("homeXPStat", xpData.xp || 0);
  setText("homeStreakStat", streak.count || 0);

  const quotes = [
    "Small wins create massive transformations.",
    "Discipline will take you where motivation cannot.",
    "Consistency changes the body faster than intensity.",
    "Train today to thank yourself tomorrow."
  ];

  const quoteEl = document.getElementById("homeMotivationQuote");
  if (quoteEl) {
    const dayIndex = new Date().getDate() % quotes.length;
    quoteEl.innerText = quotes[dayIndex];
  }
}

/* =========================
   DAILY RESET / MISSIONS
========================= */

function resetTodayProgress() {
  localStorage.removeItem("fitai_checkin");
  localStorage.removeItem("fitai_nutrition");
  renderCheckInUI();
  renderNutritionUI();
  renderProfileScreen();
  showTemporaryPopup("Today's progress reset");
}

function setupMissionCheckboxes() {
  const mapping = [
    { id: "missionWorkout", xp: 25 },
    { id: "missionWater", xp: 15 },
    { id: "missionProtein", xp: 20 },
    { id: "missionWeight", xp: 10 }
  ];

  mapping.forEach((item) => {
    const checkbox = document.getElementById(item.id);
    if (!checkbox) return;

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        addXP(item.xp);
      }
      updateBadges();
    });
  });
}

function updateBadges() {
  const streak = getStreakData();
  const xpData = getXPData();

  const badge3 = document.getElementById("badge-streak3");
  const badge2 = document.getElementById("badge-level2");
  const badge3level = document.getElementById("badge-level3");
  const badgeAll = document.getElementById("badge-all-missions");

  if (badge3) {
    badge3.classList.toggle("unlocked", streak.count >= 3);
    badge3.classList.toggle("locked", streak.count < 3);
  }

  if (badge2) {
    badge2.classList.toggle("unlocked", xpData.level >= 2);
    badge2.classList.toggle("locked", xpData.level < 2);
  }

  if (badge3level) {
    badge3level.classList.toggle("unlocked", xpData.level >= 3);
    badge3level.classList.toggle("locked", xpData.level < 3);
  }

  const missionIds = ["missionWorkout", "missionWater", "missionProtein", "missionWeight"];
  const allDone = missionIds.every((id) => document.getElementById(id)?.checked);

  if (badgeAll) {
    badgeAll.classList.toggle("unlocked", allDone);
    badgeAll.classList.toggle("locked", !allDone);
  }
}

/* =========================
   ENTER TO SEND
========================= */

function setupMessageInput() {
  const input = document.getElementById("message");
  if (!input) return;

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });
}

/* =========================
   INIT
========================= */

function initApp() {
  applySettings(loadSettings());

  currentChatId = localStorage.getItem("fitai_current_chat_id") || null;

  startHeroSlider();
  applyScreenBackgrounds();
setInterval(rotateScreenBackgrounds, 7000);

  renderStreak();
  renderHomeSummary();
  renderCheckInUI();
  renderNutritionUI();
  renderWeeklyPlanner();
  renderReminder();
  renderProfileScreen();
  renderGamification();
  updateBadges();
  renderChatHistoryList();
  renderDrawerRecentChats();
  updateActiveChatTitle();

  setupImagePreview("frontPhoto", "frontPreview", "frontFileName", "frontRemoveBtn");
  setupImagePreview("sidePhoto", "sidePreview", "sideFileName", "sideRemoveBtn");
  setupImagePreview("backPhoto", "backPreview", "backFileName", "backRemoveBtn");

  setupMissionCheckboxes();
  setupMessageInput();
  document.querySelectorAll(".nav-btn, .primary-btn, .secondary-btn, .send-btn, .chat-suggestion-chip").forEach((el) => {
  el.addEventListener("click", () => {
    el.classList.remove("iphone-soft-pop");
    void el.offsetWidth;
    el.classList.add("iphone-soft-pop");
  });
});

document.querySelectorAll(".card, .mini-stat-card, .summary-item").forEach((el) => {
  el.classList.add("iphone-animate-in");
});

  const existingSessions = loadChatSessions();
  if (currentChatId && existingSessions.some((s) => s.id === currentChatId)) {
    loadChatSession(currentChatId);
  } else {
    const welcome = document.getElementById("chatWelcomeState");
    if (welcome) welcome.style.display = "block";
  }
}

document.addEventListener("DOMContentLoaded", initApp);
/* =========================
   ROUTINE PLAYER SYSTEM
========================= */


let currentCoachAudio = null;

async function speakCoachWithElevenLabs(text) {
  if (!text) return;

  const settings = loadSettings ? loadSettings() : { soundEnabled: true };
  if (settings.soundEnabled === false) return;

  try {
    if (currentCoachAudio) {
      currentCoachAudio.pause();
      currentCoachAudio = null;
    }

    const response = await fetch(`${API_BASE}/speak-coach`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text })
    });

    const data = await response.json();

    if (!data.success || !data.audio_base64) {
  console.log("Voice API failed:", data.message || "unknown error");

  if ("speechSynthesis" in window) {
    const fallback = new SpeechSynthesisUtterance(text);
    fallback.lang = "en-US";
    fallback.rate = 1.0;
    fallback.pitch = 1.05;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(fallback);
  }

  return;
}

    const audioSrc = `data:${data.mime_type || "audio/mpeg"};base64,${data.audio_base64}`;
    currentCoachAudio = new Audio(audioSrc);
    currentCoachAudio.play();
  } catch (error) {
    console.log("ElevenLabs play failed.", error);
  }
}
const animationLibrary = {
  pushup_live: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=900&q=80",
  squat_live: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80",
  jumping_jack_live: "https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&w=900&q=80",
  plank_live: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80",
  lunges_live: "https://images.unsplash.com/photo-1594737625785-a6cbdabd333c?auto=format&fit=crop&w=900&q=80",
  bike_crunch_live: "https://images.unsplash.com/photo-1599058917765-a780eda07a3e?auto=format&fit=crop&w=900&q=80",
  mountain_climber_live: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80",
  bench_press_live: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=900&q=80",
  bench_dips_live: "https://images.unsplash.com/photo-1558611848-73f7eb4001a1?auto=format&fit=crop&w=900&q=80"
};
function speakNumber(num) {
  if (num === undefined || num === null) return;

  const settings = loadSettings ? loadSettings() : { soundEnabled: true };
  if (settings.soundEnabled === false) return;

  try {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(String(num));
    utterance.lang = "en-US";
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    utterance.volume = 1;

    window.speechSynthesis.speak(utterance);
  } catch (error) {
    console.log("Voice count failed.");
  }
}

function pulseEffect() {
  const el = document.getElementById("routineAnimationViewport");
  if (!el) return;

  el.style.boxShadow = "0 0 40px rgba(185,255,114,0.7)";

  setTimeout(() => {
    el.style.boxShadow = "";
  }, 250);
}
function loadWorkoutImage(animationKey) {
  const imageEl = document.getElementById("routineWorkoutImage");
  if (!imageEl) return;

  const imageUrl = animationLibrary[animationKey] || animationLibrary["pushup_live"];
  imageEl.src = imageUrl;
}

window.routineState = {
  data: null,
  dayIndex: 0,
  exerciseIndex: 0,
  timerSeconds: 30,
  timerTotal: 30,
  timerRunning: false,
  timerInterval: null,
  repCounter: 0,
  currentSet: 1
};

function getRoutineProfilePayload() {
  return {
    user_id: "default_user",
    name: document.getElementById("name")?.value?.trim() || "User",
    age: Number(document.getElementById("age")?.value || 20),
    weight: Number(document.getElementById("weight")?.value || 60),
    height: Number(document.getElementById("height")?.value || 170),
    gender: document.getElementById("gender")?.value || "Male",
    workout_place: document.getElementById("workoutPlace")?.value || "Home Workout",
    goal: document.getElementById("goal")?.value || "Muscle Gain",
    level: "Beginner",
    workout_days: 5,
    language: document.getElementById("chatLanguage")?.value || "English",
    injuries: "",
    equipment: ""
  };
}

function getCurrentRoutineDay() {
  const routine = window.routineState.data?.routine?.days || [];
  return routine[window.routineState.dayIndex] || null;
}

function getCurrentRoutineExercise() {
  const day = getCurrentRoutineDay();
  if (!day) return null;
  return day.exercises?.[window.routineState.exerciseIndex] || null;
}

function getRoutineViewportClass(animationKey) {
  const map = {
    pushup_live: "pushup-live",
    squat_live: "squat-live",
    jumping_jack_live: "jumping-jack-live",
    plank_live: "plank-live",
    lunges_live: "lunges-live",
    bike_crunch_live: "bike-crunch-live",
    mountain_climber_live: "mountain-climber-live",
    glute_bridge_live: "glute-bridge-live",
    bench_press_live: "bench-press-live",
    bench_dips_live: "bench-dips-live"
  };
  return map[animationKey] || "pushup-live";
}

function getRoutineMuscleText(exerciseName = "") {
  const name = String(exerciseName).toLowerCase();

  if (name.includes("push")) return "Chest • Triceps • Core";
  if (name.includes("bench press")) return "Chest • Triceps • Front Delts";
  if (name.includes("bike crunch")) return "Abs • Obliques • Core";
  if (name.includes("bench dips")) return "Triceps • Chest • Shoulders";
  if (name.includes("squat")) return "Quads • Glutes • Hamstrings";
  if (name.includes("plank")) return "Core • Abs • Shoulders";
  if (name.includes("lunge")) return "Quads • Glutes • Balance";
  if (name.includes("mountain")) return "Core • Cardio • Shoulders";
  if (name.includes("jumping")) return "Full Body • Cardio";
  if (name.includes("glute")) return "Glutes • Hamstrings • Core";

  return "Full Body Training";
}

function formatRoutineTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function updateRoutineTimerUI() {
  const timeEl = document.getElementById("routineTimeValue");
  const fillEl = document.getElementById("routineProgressFill");
  const statusEl = document.getElementById("routineTimerStatus");
  const repEl = document.getElementById("routineRepCounter");
  const setEl = document.getElementById("routineSetCounter");

  if (timeEl) timeEl.textContent = formatRoutineTime(window.routineState.timerSeconds);

  const donePercent = window.routineState.timerTotal > 0
    ? ((window.routineState.timerTotal - window.routineState.timerSeconds) / window.routineState.timerTotal) * 100
    : 0;

  if (fillEl) fillEl.style.width = `${Math.max(0, Math.min(100, donePercent))}%`;
  if (statusEl) statusEl.textContent = window.routineState.timerRunning ? "Running" : "Paused";
  if (repEl) repEl.textContent = window.routineState.repCounter;
  if (setEl) setEl.textContent = window.routineState.currentSet;
}

function stopRoutineTimer() {
  if (window.routineState.timerInterval) {
    clearInterval(window.routineState.timerInterval);
    window.routineState.timerInterval = null;
  }
  window.routineState.timerRunning = false;
  updateRoutineTimerUI();
}

function resetRoutineTimer() {
  stopRoutineTimer();

  const exercise = getCurrentRoutineExercise();
  const restSeconds = Number(exercise?.rest_seconds || 30);

  window.routineState.timerTotal = restSeconds;
  window.routineState.timerSeconds = restSeconds;
  window.routineState.repCounter = 0;
 
  window.routineState.currentSet = 1;

  updateRoutineTimerUI();
}

function playRoutineBeep() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.12);
  } catch (error) {
    console.log("Sound could not play.");
  }
}

function toggleRoutineTimer() {
  if (!getCurrentRoutineExercise()) return;

  if (window.routineState.timerRunning) {
    stopRoutineTimer();
    return;
  }

  window.routineState.timerRunning = true;
  updateRoutineTimerUI();

  window.routineState.timerInterval = setInterval(() => {
    const exercise = getCurrentRoutineExercise();
    if (!exercise) {
      stopRoutineTimer();
      return;
    }

    if (window.routineState.timerSeconds > 0) {
      window.routineState.timerSeconds -= 1;

      const totalReps = Number(exercise.reps || 0);
      const elapsed = window.routineState.timerTotal - window.routineState.timerSeconds;

      if (totalReps > 0 && window.routineState.timerTotal > 0) {
        const estimatedReps = Math.floor((elapsed / window.routineState.timerTotal) * totalReps);
        window.routineState.repCounter = Math.min(totalReps, estimatedReps);
        speakNumber(window.routineState.repCounter);

      }

      updateRoutineTimerUI();

      if (window.routineState.timerSeconds <= 3 && window.routineState.timerSeconds > 0) {
        playRoutineBeep();
      }
    } else {
      playRoutineBeep();
      document.body.style.background = "#0f0";

setTimeout(() => {
  document.body.style.background = "";
}, 150);
      stopRoutineTimer();

      const exerciseSets = Number(exercise.sets || 1);

      if (window.routineState.currentSet < exerciseSets) {
        window.routineState.currentSet += 1;
        window.routineState.timerSeconds = window.routineState.timerTotal;
        window.routineState.repCounter = 0;
        updateRoutineTimerUI();
      } else {
        document.getElementById("routineTimerStatus").textContent = "Completed";
      
      }
    }
  }, 1000);
}

function renderRoutineDayTabs() {
  const tabsWrap = document.getElementById("routineDayTabs");
  const days = window.routineState.data?.routine?.days || [];
  if (!tabsWrap) return;

  tabsWrap.innerHTML = days.map((day, index) => `
    <button
      type="button"
      class="routine-day-tab ${index === window.routineState.dayIndex ? "active" : ""}"
      onclick="selectRoutineDay(${index})"
    >
      ${day.day || `Day ${index + 1}`}
    </button>
  `).join("");
}

function renderRoutineExercise() {
  const routineObj = window.routineState.data?.routine;
  const day = getCurrentRoutineDay();
  const exercise = getCurrentRoutineExercise();

  if (!routineObj || !day || !exercise) return;

  const titleEl = document.getElementById("routinePlanTitle");
  const subtitleEl = document.getElementById("routinePlanSubtitle");
  const sequenceEl = document.getElementById("routineSequenceText");
  const focusEl = document.getElementById("routineFocusText");
  const muscleEl = document.getElementById("routineMuscleLabel");
  const viewportEl = document.getElementById("routineAnimationViewport");
  const exerciseNameEl = document.getElementById("routineExerciseName");
  const noteEl = document.getElementById("routineExerciseNote");
  const setsEl = document.getElementById("routineSetsValue");
  const repsEl = document.getElementById("routineRepsValue");
  const restEl = document.getElementById("routineRestValue");

  if (titleEl) titleEl.textContent = routineObj.routine_name || "Workout Player";
  if (subtitleEl) subtitleEl.textContent = routineObj.summary || "AI-selected exercise animations for your plan";
  if (sequenceEl) sequenceEl.textContent = `${window.routineState.exerciseIndex + 1} of ${day.exercises.length}`;
  if (focusEl) focusEl.textContent = day.focus || "Workout Focus";
  if (muscleEl) muscleEl.textContent = getRoutineMuscleText(exercise.name);
  if (exerciseNameEl) exerciseNameEl.textContent = exercise.name || "Exercise";
  if (noteEl) noteEl.textContent = exercise.notes || "Train with control and good form.";
  if (setsEl) setsEl.textContent = exercise.sets ?? "-";
  if (repsEl) repsEl.textContent = exercise.reps ?? "-";
  if (restEl) restEl.textContent = `${exercise.rest_seconds || 30}s`;

  if (viewportEl) {
    viewportEl.className = `routine-animation-viewport ${getRoutineViewportClass(exercise.animation_key)}`;
  }
 loadWorkoutImage(exercise.animation_key); 

  resetRoutineTimer();
  renderRoutineDayTabs();
}

function selectRoutineDay(index) {
  window.routineState.dayIndex = index;
  window.routineState.exerciseIndex = 0;
  renderRoutineExercise();
}

function nextRoutineExercise() {
  const day = getCurrentRoutineDay();
  if (!day) return;

  if (window.routineState.exerciseIndex < day.exercises.length - 1) {
    window.routineState.exerciseIndex += 1;
  } else if (window.routineState.dayIndex < (window.routineState.data?.routine?.days.length || 0) - 1) {
    window.routineState.dayIndex += 1;
    window.routineState.exerciseIndex = 0;
  }

  renderRoutineExercise();
}

function prevRoutineExercise() {
  if (window.routineState.exerciseIndex > 0) {
    window.routineState.exerciseIndex -= 1;
  } else if (window.routineState.dayIndex > 0) {
    window.routineState.dayIndex -= 1;
    const prevDay = getCurrentRoutineDay();
    window.routineState.exerciseIndex = Math.max(0, (prevDay?.exercises?.length || 1) - 1);
  }

  renderRoutineExercise();
}

async function markRoutineDone() {
  const day = getCurrentRoutineDay();
  const exercise = getCurrentRoutineExercise();
  if (!day || !exercise) return;

  playRoutineBeep();
  stopRoutineTimer();

  try {
    await fetch(`${API_BASE}/save-routine-progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        user_id: "default_user",
        day_index: window.routineState.dayIndex,
        exercise_index: window.routineState.exerciseIndex,
        completed: true
      })
    });
  } catch (error) {
    console.log("Progress save failed.");
  }

  nextRoutineExercise();
}

function addRoutineOpenButtonToChat() {
  const chatBox = document.getElementById("chat-box");
  if (!chatBox) return;

  const wrap = document.createElement("div");
  wrap.className = "message bot premium-bot";
  wrap.innerHTML = `
    <div>
      <strong>Your workout animation routine is ready.</strong>
      <div style="margin-top:10px;">
        <button type="button" class="primary-btn" onclick="switchScreen('routine')">
          Open My Workout Animations
        </button>
      </div>
    </div>
  `;

  chatBox.appendChild(wrap);
  chatBox.scrollTop = chatBox.scrollHeight;

  const welcome = document.getElementById("chatWelcomeState");
  if (welcome) welcome.style.display = "none";
}

async function generateRoutineFromPlan() {
  const payload = getRoutineProfilePayload();
  const chatBox = document.getElementById("chat-box");
  const welcome = document.getElementById("chatWelcomeState");

  if (welcome) welcome.style.display = "none";

  if (chatBox) {
    const loading = document.createElement("div");
    loading.className = "message bot premium-bot";
    loading.id = "routineLoadingMessage";
    loading.innerHTML = `<div><strong>FitAI is building your live workout routine...</strong></div>`;
    chatBox.appendChild(loading);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  try {
    const response = await fetch(`${API_BASE}/generate-routine`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    const loadingEl = document.getElementById("routineLoadingMessage");
    if (loadingEl) loadingEl.remove();

    if (!data.success || !data.data || !data.data.routine) {
      throw new Error("Routine generation failed");
    }

    window.routineState.data = data.data;
    window.routineState.dayIndex = 0;
    window.routineState.exerciseIndex = 0;

    localStorage.setItem("fitai_latest_routine", JSON.stringify(data.data));

    renderRoutineExercise();
    
   
  } catch (error) {
    console.log(error);

    const loadingEl = document.getElementById("routineLoadingMessage");
    if (loadingEl) loadingEl.remove();

    if (chatBox) {
      const err = document.createElement("div");
      err.className = "message bot premium-bot";
      err.innerHTML = `<div><strong>Routine generate කරන්න බැරි වුණා.</strong><div style="margin-top:8px;">Backend run වෙනවාද බලන්න.</div></div>`;
      chatBox.appendChild(err);
    }
  }
}

