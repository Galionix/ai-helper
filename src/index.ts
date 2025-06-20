import IdleJs from "idle-js";
import { base64Audio } from "./audio";
import { el } from "./el";
import { showToast } from "./showToast";

const audio = new Audio(base64Audio);

const CSS = `
  #ai-helper-toggle {
    position: fixed; bottom: 20px; right: 20px; z-index: 999999;
    width: 48px; height: 48px; border-radius: 50%; font-size: 24px;
    background:rgb(35, 51, 68); color: white; border: none; cursor: pointer;
  }
  #ai-helper-widget { position: fixed; bottom: 80px; right: 20px; width: 420px; height: 400px;
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
    .chat-message {
      border-radius: 5px;
      padding: 5px;
    }
      .chat-message label {
      font-size: 0.8em;
      color: gray;
      }
    .ai-message {
      border: 1px solid #517b79;
    }
    .user-message {
      border: 1px solid #83794b;
      text-align: end;
    }
`;

GM_addStyle(CSS);

async function addChatMessage(sender: string, text: string) {
  const raw = await GM_getValue("chat", "[]");
  const chat = JSON.parse(raw);
  console.log("chat: ", chat);
  chat.push({ sender, text, time: new Date().toLocaleTimeString() });
  await GM_setValue("chat", JSON.stringify(chat.slice(-50)));
  renderChat();
}
type Message = {
  time: string;
  sender: string;
  text: string;
};
type Event = {
  domain: string;
  timestamp: string;
  duration: number;
};
async function renderChat() {
  const container = document.getElementById("ai-helper-chat-messages");
  if (!container) return;
  const raw = await GM_getValue("chat", "[]");
  const chat: Message[] = JSON.parse(raw);
  container.textContent = "";
  chat.slice(-50).forEach((msg) => {
    container.append(
      el("div", {
        children: [
          el('p', {
            textContent: `${msg.text}`,
          }),
          el('label', {
            textContent: msg.time,
          })
        ],

        style: { marginBottom: "4px", whiteSpace: "pre-wrap" },
        className:
          `chat-message ${msg.sender === "AI" ? "ai-message" : "user-message"}`,
      })
    );
  });
  const lastMessage = container.lastElementChild;
  if (lastMessage) lastMessage.scrollIntoView({ behavior: "instant" });
}

function createElements() {
  if (!document.getElementById("ai-helper-toggle")) {
    document.body.appendChild(
      el("button", {
        id: "ai-helper-toggle",
        textContent: "🤖",

        listeners: { click: toggleWidget },
      })
    );
  }

  if (!document.getElementById("ai-helper-widget")) {
    const input = el("input", {
      id: "ai-helper-apikey",
      placeholder: "sk-...",
    });
    const goals = el("textarea", {
      id: "ai-helper-goals",
      placeholder:
        "Например: лечь спать до 23:00, не тратить время на соцсети...",
    });
    const reminders = el("textarea", {
      id: "ai-helper-reminders",
      placeholder:
        "Например: лечь спать до 23:00, не тратить время на соцсети...",
    });
    const intervalInput = el("input", {
      id: "ai-helper-interval",
      placeholder: "Интервал уведомлений (мин)",
    });
    const interval2Input = el("input", {
      id: "ai-helper-interval2",
      placeholder: "Интервал регулярных нфпоминаний (мин)",
    });
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
        marginTop: "10px",
      },
      listeners: {
        keydown: (e) => {
          // @ts-ignore
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendUserMessage();
          }
        },
      },
    });

    const sendBtn = el("button", {
      textContent: "Отправить",
      style: {
        width: "100%",
        marginTop: "5px",
      },
      listeners: {
        click: sendUserMessage,
      },
    });

    const widget = el("div", {
      id: "ai-helper-widget",
      style: {
        display: "none",
      },
      children: [
        el("div", {
          id: "ai-helper-tabs",
          children: [
            el("div", {
              className: "ai-helper-tab active",
              dataset: { tab: "chat" },
              textContent: "Чат",
            }),
            el("div", {
              className: "ai-helper-tab",
              dataset: { tab: "settings" },
              textContent: "⚙️",
            }),
            el("div", {
              className: "ai-helper-tab",
              dataset: { tab: "stats" },
              textContent: "📊",
            }),
          ],
        }),
        el("div", {
          id: "ai-helper-chat",
          className: "ai-helper-content",
          children: [
            el("div", {
              id: "ai-helper-chat-messages",
              style: { flex: "1", overflowY: "auto", marginBottom: "10px" },
            }),
            messageInput,
            sendBtn,
          ],
        }),
        el("div", {
          id: "ai-helper-settings",
          className: "ai-helper-content",
          style: { display: "none" },
          children: [
            el("label", { textContent: "API Key:" }),
            input,
            el("label", { textContent: "Цели:" }),
            goals,
            el("label", { textContent: "Напоминания:" }),
            reminders,
            el("label", { textContent: "Интервал уведомлений (мин):" }),
            intervalInput,
            el("label", { textContent: "Интервал напоминаний (мин):" }),
            interval2Input,
          ],
        }),
        el("div", {
          id: "ai-helper-stats",
          className: "ai-helper-content",
          style: { display: "none" },
          children: [
            el("div", {
              id: "ai-helper-stats-list",
              textContent: "Загрузка...",
            }),
          ],
        }),
      ],
    });

    document.body.appendChild(widget);

    widget.querySelectorAll(".ai-helper-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const name = tab.getAttribute("data-tab");
        const wasActive = tab.classList.contains("active");
        widget
          .querySelectorAll(".ai-helper-tab")
          .forEach((t) => t.classList.remove("active"));
        widget
          .querySelectorAll(".ai-helper-content")
          .forEach((c) => c.setAttribute("style", "display:none"));
        tab.classList.add("active");
        widget
          .querySelector(`#ai-helper-${name}`)
          ?.setAttribute("style", "display:block");
        if (name === "stats") {
          if (wasActive) showToast("Статистика обновлена");
          renderStats();
        } else if (name === "chat") {
          renderChat();
        }
      });
    });

    input.addEventListener(
      "change",
      async () => await GM_setValue("openai_key", input.value)
    );
    goals.addEventListener(
      "change",
      async () => await GM_setValue("goals", goals.value)
    );
    reminders.addEventListener(
      "change",
      async () => await GM_setValue("reminders", reminders.value)
    );
    intervalInput.addEventListener("change", async () => {
      await GM_setValue("interval", parseInt(intervalInput.value || "5"));
    });
    interval2Input.addEventListener("change", async () => {
      await GM_setValue("interval2", parseInt(interval2Input.value || "5"));
    });

    input.value = GM_getValue("openai_key", "");
    goals.value = GM_getValue("goals", "");
    reminders.value = GM_getValue("reminders", "");
    intervalInput.value = GM_getValue("interval", 5);
    interval2Input.value = GM_getValue("interval2", 5);
    // showToast("Добро пожаловать!");
  }
}

function toggleWidget() {
  const widget = document.getElementById("ai-helper-widget");
  if (!widget) return;
  renderChat();

  widget.style.display = widget.style.display === "none" ? "flex" : "none";
}

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

async function renderStats() {
  const container = document.getElementById("ai-helper-stats-list");
  if (!container) return;
  const raw = await GM_getValue("eventLog", "[]");
  const events: Event[] = JSON.parse(raw);
  container.textContent = "";
  if (events.length === 0) {
    container.append(el("p", { textContent: "Нет данных" }));
    return;
  }
  for (const entry of events.reverse()) {
    container.append(
      el("div", {
        children: [
          el("b", { textContent: entry.domain }),
          // @ts-ignore
          document.createTextNode(
            ` — ${entry.timestamp} (${Math.round(entry.duration / 1000)} сек)`
          ),
        ],
      })
    );
  }
}

let sessionStart = Date.now();
let currentDomain = getDomain(location.href);

async function logSessionEnd() {
  console.log("user inactive");
  const duration = Date.now() - sessionStart;
  const now = new Date().toLocaleString();
  const raw = await GM_getValue("eventLog", "[]");
  const log = JSON.parse(raw);
  log.push({ domain: currentDomain, timestamp: now, duration });
  await GM_setValue("eventLog", JSON.stringify(log));
}

let lastAdviceTime = Date.now();
let lastRemindTime = Date.now();
async function getAdvice(goals: string, recentEvents: string) {
  const key = await GM_getValue("openai_key", "");
  if (!key) return "API ключ не задан";
  const messages = [
    {
      role: "system",
      content: goals,
    },
    {
      role: "user",
      content:
        `Недавняя активность:\n${recentEvents}\nСейчас пользователь на странице c заголовком: \n${document.title}\nЧто стоит напомнить ему сейчас?`.replaceAll(
          "\n",
          " "
        ),
    },
  ];
  console.log("messages: ", messages);
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages,
      temperature: 0.7,
    }),
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
    if (navigator.mediaSession.playbackState == "playing") {
      try {
        document.getElementsByTagName("video")[0].pause();
      } catch {
        console.log("there is no video tag");
      }
      try {
        document.getElementsByTagName("audio")[0].pause();
      } catch {
        console.log("there is no audio tag");
      }
      navigator.mediaSession.playbackState = "paused";
    }

    const raw = await GM_getValue("eventLog", "[]");
    const events: Event[] = JSON.parse(raw).slice(-5);
    const recent = events
      .map(
        (e) =>
          `${e.domain} (${Math.round(e.duration / 1000)} сек в ${e.timestamp})`
      )
      .join("\n");
    const advice = await getAdvice(goals, recent);
    showToast(advice);
    audio.play().catch(() => {});
    await addChatMessage("AI", advice);
    lastAdviceTime = now;
  }
}
async function maybeRemindUser() {
  const reminders = await GM_getValue("reminders", "");
  if (!reminders) return;
  const interval = (await GM_getValue("interval2", 5)) * 60000;
  const now = Date.now();
  if (now - lastRemindTime > interval) {
    if (navigator.mediaSession.playbackState == "playing") {
      try {
        document.getElementsByTagName("video")[0].pause();
      } catch {
        console.log("there is no video tag");
      }
      try {
        document.getElementsByTagName("audio")[0].pause();
      } catch {
        console.log("there is no audio tag");
      }
      navigator.mediaSession.playbackState = "paused";
    }

    const raw = await GM_getValue("eventLog", "[]");
    const events: Event[] = JSON.parse(raw).slice(-5);
    const recent = events
      .map(
        (e) =>
          `${e.domain} (${Math.round(e.duration / 1000)} сек в ${e.timestamp})`
      )
      .join("\n");
    const advice = await getAdvice(reminders, recent);
    showToast(advice);
    audio.play().catch(() => {});
    await addChatMessage("AI", advice);
    lastRemindTime = now;
  }
}
(function () {
  if (window.top !== window.self) return;
  const idle = new IdleJs({
    idle: 60000,
    events: ["mousemove", "keydown", "mousedown", "touchstart", "scroll"],
    onIdle: logSessionEnd,
    onActive: () => {
      console.log("user active");
      sessionStart = Date.now();
      currentDomain = getDomain(location.href);
    },
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
      // createElements();
    }
    console.log("maybeAdviseUser called ");
    console.log("document.hasFocus: ", document.hasFocus());
    if (document.hasFocus()) {
      maybeRemindUser();
    }
    if (
      // document.hasFocus()
      navigator.mediaSession.playbackState == "playing"
    ) {
      maybeAdviseUser();
    }
  }, 10000);
})();

async function sendUserMessage() {
  const input = document.getElementById(
    "ai-helper-input"
  ) as HTMLTextAreaElement;
  const key = await GM_getValue("openai_key", "");
  const goals = await GM_getValue("goals", "");
  const raw = await GM_getValue("chat", "[]");

  if (!input.value.trim() || !key) return;

  const userMessage = input.value.trim();
  input.value = "";

  const chat: Message[] = JSON.parse(raw);
  const recent = chat.slice(-5).map((m) => ({
    role: m.sender === "AI" ? "assistant" : "user",
    content: m.text,
  }));

  // Добавим сообщение пользователя в историю чата
  await addChatMessage("Вы", userMessage);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Ты AI помощник. Цели пользователя: ${goals}`,
        },
        ...recent,
        { role: "user", content: userMessage },
      ],
    }),
  });

  const json = await res.json();
  const reply = json.choices?.[0]?.message?.content || "Нет ответа от модели.";
  await addChatMessage("AI", reply);
  audio.play().catch(() => {});
}
