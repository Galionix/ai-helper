// ==UserScript==
// @name         AI Helper
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

import { Notyf } from "notyf";
import "notyf/notyf.min.css";
import IdleJs from "idle-js";

const notyf = new Notyf({
  duration: 0,
  dismissible: true,
  position: { y: "top", x: "right" },
});

const audio = new Audio("https://proxy.notificationsounds.com/notification-sounds/confident-543/download/file-sounds-1083-confident.mp3");

function el(tag, options = {}) {
  const element = document.createElement(tag);
  if (options.id) element.id = options.id;
  if (options.className) element.className = options.className;
  if (options.textContent) element.textContent = options.textContent;
  if (options.placeholder) element.placeholder = options.placeholder;
  if (options.dataset) Object.entries(options.dataset).forEach(([k, v]) => element.dataset[k] = v);
  if (options.children) element.append(...options.children);
  if (options.listeners) Object.entries(options.listeners).forEach(([k, v]) => element.addEventListener(k, v));
  if (options.style) Object.assign(element.style, options.style);
  return element;
}

const CSS = `
  #ai-helper-toggle {
    position: fixed; bottom: 20px; right: 20px; z-index: 999999;
    width: 48px; height: 48px; border-radius: 50%; font-size: 24px;
    background: #007bff; color: white; border: none; cursor: pointer;
  }
  #ai-helper-widget { position: fixed; bottom: 80px; right: 20px; width: 320px; height: 400px;
    background: #1e1e1e; color: white; border-radius: 12px; z-index: 999998;
    display: none; flex-direction: column; font-family: sans-serif; box-shadow: 0 0 20px rgba(0,0,0,0.5);
  }
  #ai-helper-tabs { display: flex; background: #2e2e2e; }
  .ai-helper-tab { flex: 1; padding: 10px; text-align: center; cursor: pointer; }
  .ai-helper-tab.active { background: #007bff; }
  .ai-helper-content { flex: 1; overflow-y: auto; padding: 10px; }
  #ai-helper-settings input, #ai-helper-settings textarea {
    width: 100%; padding: 6px; background: #333; color: white; border: 1px solid #555; margin-top: 5px;
  }
`;

GM_addStyle(CSS);

async function addChatMessage(sender, text) {
  const raw = await GM_getValue("chat", "[]");
  const chat = JSON.parse(raw);
  console.log('chat: ', chat);
  chat.push({ sender, text, time: new Date().toLocaleTimeString() });
  await GM_setValue("chat", JSON.stringify(chat));
  renderChat();
}

async function renderChat() {
  const container = document.getElementById("ai-helper-chat-messages");
  if (!container) return;
  const raw = await GM_getValue("chat", "[]");
  const chat = JSON.parse(raw);
  container.textContent = "";
  chat.slice(-50).forEach(msg => {
    container.append(el("div", {
      textContent: `[${msg.time}] ${msg.sender}: ${msg.text}`,
      style: { marginBottom: "4px", whiteSpace: "pre-wrap" }
    }));
  });
}

function createElements() {
  if (!document.getElementById("ai-helper-toggle")) {
    document.body.appendChild(el("button", {
      id: "ai-helper-toggle",
      textContent: "🤖",
      listeners: { click: toggleWidget }
    }));
  }

  if (!document.getElementById("ai-helper-widget")) {
    const input = el("input", { id: "ai-helper-apikey", placeholder: "sk-..." });
    const goals = el("textarea", { id: "ai-helper-goals", placeholder: "Например: лечь спать до 23:00, не тратить время на соцсети..." });
    const intervalInput = el("input", { id: "ai-helper-interval", placeholder: "Интервал уведомлений (мин)" });

    const messageInput = el("textarea", {
      id: "ai-helper-input",
      placeholder: "Введите сообщение...",
      style: {
        width: "100%",
        height: "60px",
        background: "#333",
        color: "white",
        border: "1px solid #555",
        resize: "none",
        marginTop: "10px"
      },
      listeners: {
        keydown: (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendUserMessage();
          }
        }
      }
    });

    const sendBtn = el("button", {
      textContent: "Отправить",
      style: {
        width: "100%",
        marginTop: "5px"
      },
      listeners: {
        click: sendUserMessage
      }
    });

    const widget = el("div", {
      id: "ai-helper-widget",
      children: [
        el("div", {
          id: "ai-helper-tabs",
          children: [
            el("div", { className: "ai-helper-tab active", dataset: { tab: "chat" }, textContent: "Чат" }),
            el("div", { className: "ai-helper-tab", dataset: { tab: "settings" }, textContent: "⚙️" }),
            el("div", { className: "ai-helper-tab", dataset: { tab: "stats" }, textContent: "📊" })
          ]
        }),
        el("div", {
          id: "ai-helper-chat",
          className: "ai-helper-content",
          children: [
            el("div", { id: "ai-helper-chat-messages", style: { flex: 1, overflowY: "auto", marginBottom: "10px" } }),
            messageInput,
            sendBtn
          ]
        }),
        el("div", {
          id: "ai-helper-settings", className: "ai-helper-content", style: { display: "none" },
          children: [
            el("label", { textContent: "API Key:" }), input,
            el("label", { textContent: "Цели:" }), goals,
            el("label", { textContent: "Интервал уведомлений (мин):" }), intervalInput
          ]
        }),
        el("div", {
          id: "ai-helper-stats", className: "ai-helper-content", style: { display: "none" },
          children: [el("div", { id: "ai-helper-stats-list", textContent: "Загрузка..." })]
        })
      ]
    });

    document.body.appendChild(widget);

    widget.querySelectorAll(".ai-helper-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        const name = tab.getAttribute("data-tab");
        const wasActive = tab.classList.contains("active");
        widget.querySelectorAll(".ai-helper-tab").forEach(t => t.classList.remove("active"));
        widget.querySelectorAll(".ai-helper-content").forEach(c => c.setAttribute("style", "display:none"));
        tab.classList.add("active");
        widget.querySelector(`#ai-helper-${name}`)?.setAttribute("style", "display:block");
        if (name === "stats") {
          if (wasActive) notyf.success("Статистика обновлена");
          renderStats();
        } else if (name === "chat") {
          renderChat();
        }
      });
    });

    input.addEventListener("change", async () => await GM_setValue("openai_key", input.value));
    goals.addEventListener("change", async () => await GM_setValue("goals", goals.value));
    intervalInput.addEventListener("change", async () => await GM_setValue("interval", parseInt(intervalInput.value || "5")));

    input.value = GM_getValue("openai_key", "");
    goals.value = GM_getValue("goals", "");
    intervalInput.value = GM_getValue("interval", 5);
    notyf.success("Добро пожаловать!");
  }
}

function toggleWidget() {
  const widget = document.getElementById("ai-helper-widget");
  if (!widget) return;
  widget.style.display = widget.style.display === "none" ? "flex" : "none";
}

function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "unknown"; }
}

async function renderStats() {
  const container = document.getElementById("ai-helper-stats-list");
  if (!container) return;
  const raw = await GM_getValue("eventLog", "[]");
  const events = JSON.parse(raw);
  container.textContent = "";
  if (events.length === 0) {
    container.append(el("p", { textContent: "Нет данных" }));
    return;
  }
  for (const entry of events.reverse()) {
    container.append(el("div", {
      children: [
        el("b", { textContent: entry.domain }),
        document.createTextNode(` — ${entry.timestamp} (${Math.round(entry.duration / 1000)} сек)`)
      ]
    }));
  }
}

let sessionStart = Date.now();
let currentDomain = getDomain(location.href);

async function logSessionEnd() {
  const duration = Date.now() - sessionStart;
  const now = new Date().toLocaleString();
  const raw = await GM_getValue("eventLog", "[]");
  const log = JSON.parse(raw);
  log.push({ domain: currentDomain, timestamp: now, duration });
  await GM_setValue("eventLog", JSON.stringify(log));
}

let lastAdviceTime = Date.now();
async function getAdvice(goals, recentEvents) {
  const key = await GM_getValue("openai_key", "");
  if (!key) return "API ключ не задан";
  const messages = [
    { role: "system", content: "Ты персональный помощник, который анализирует поведение пользователя и напоминает ему о целях." },
    { role: "user", content: `Цели пользователя:\n${goals}\n\nНедавняя активность:\n${recentEvents}\n\nЧто стоит напомнить ему сейчас?` }
  ];
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ model: "gpt-3.5-turbo", messages, temperature: 0.7 })
  });
  const json = await res.json();
  return json.choices?.[0]?.message?.content || "Нет ответа от модели.";
}

async function maybeAdviseUser() {
  const goals = await GM_getValue("goals", "");
  if (!goals) return;
  const interval = (await GM_getValue("interval", 5)) * 60000;
  const now = Date.now();
  if (now - lastAdviceTime > interval) {
    const raw = await GM_getValue("eventLog", "[]");
    const events = JSON.parse(raw).slice(-5);
    const recent = events.map(e => `${e.domain} (${Math.round(e.duration / 1000)} сек в ${e.timestamp})`).join("\n");
    const advice = await getAdvice(goals, recent);
    notyf.open({ type: "info", message: advice });
    audio.play().catch(() => {});
    await addChatMessage("AI", advice);
    lastAdviceTime = now;
  }
}

(function () {
  if (window.top !== window.self) return;
  const idle = new IdleJs({
    idle: 60000,
    events: ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'],
    onIdle: logSessionEnd,
    onActive: () => {
      sessionStart = Date.now();
      currentDomain = getDomain(location.href);
    }
  });
  idle.start();

  function safeCreate() {
    if (!document.body) return requestAnimationFrame(safeCreate);
    createElements();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", safeCreate);
  } else {
    safeCreate();
  }

  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      logSessionEnd();
      lastUrl = location.href;
      sessionStart = Date.now();
      currentDomain = getDomain(location.href);
      createElements();
    }
    maybeAdviseUser();
  }, 10000);
})();

async function sendUserMessage() {
  const input = document.getElementById("ai-helper-input") as HTMLTextAreaElement;
  const key = await GM_getValue("openai_key", "");
  const goals = await GM_getValue("goals", "");
  const raw = await GM_getValue("chat", "[]");

  if (!input.value.trim() || !key) return;

  const userMessage = input.value.trim();
  input.value = "";

  const chat = JSON.parse(raw);
  const recent = chat.slice(-5).map(m => ({
    role: m.sender === "AI" ? "assistant" : "user",
    content: m.text
  }));

  // Добавим сообщение пользователя в историю чата
  await addChatMessage("Вы", userMessage);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: `Ты AI помощник. Цели пользователя: ${goals}` },
        ...recent,
        { role: "user", content: userMessage }
      ]
    })
  });

  const json = await res.json();
  const reply = json.choices?.[0]?.message?.content || "Нет ответа от модели.";
  await addChatMessage("AI", reply);
  audio.play().catch(() => {});
}
