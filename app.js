/*
 * HeartHaven frontend.
 * Set API_URL to your deployed Worker URL before publishing.
 * Never put your Groq API key in this file.
 */
const API_URL = "PASTE_YOUR_CLOUDFLARE_WORKER_URL_HERE";


const messagesEl = document.getElementById("messages");
const welcomeEl = document.getElementById("welcome");
const inputEl = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const charCount = document.getElementById("char-count");
const sidebar = document.getElementById("sidebar");
const scrim = document.getElementById("mobile-scrim");

let conversation = [];
let busy = false;

function scrollToBottom() {
  const area = document.getElementById("chat-area");
  area.scrollTop = area.scrollHeight;
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}

function addMessage(role, content, extraClass = "") {
  welcomeEl.hidden = true;
  const row = document.createElement("div");
  row.className = `message ${role} ${extraClass}`.trim();

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = role === "assistant" ? "♡" : "You";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  // textContent avoids interpreting user/AI output as executable HTML.
  bubble.textContent = content;
  row.append(avatar, bubble);
  messagesEl.appendChild(row);
  scrollToBottom();
  return { row, bubble };
}

function addTyping() {
  welcomeEl.hidden = true;
  const row = document.createElement("div");
  row.className = "message assistant";
  row.id = "typing-indicator";
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = "♡";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  const dots = document.createElement("div");
  dots.className = "typing";
  dots.setAttribute("aria-label", "HeartHaven is thinking");
  dots.innerHTML = "<span></span><span></span><span></span>";
  bubble.appendChild(dots);
  row.append(avatar, bubble);
  messagesEl.appendChild(row);
  scrollToBottom();
  return row;
}

function setBusy(value) {
  busy = value;
  sendButton.disabled = value;
  inputEl.disabled = value;
  sendButton.innerHTML = value ? '<span>…</span>' : '<span>↑</span>';
}

async function sendMessage(rawText) {
  const text = rawText.trim();
  if (!text || busy) return;
  if (text.length > 4000) {
    showError("Please keep each message under 4,000 characters.");
    return;
  }

  inputEl.value = "";
  resizeInput();
  charCount.textContent = "0 / 4000";
  addMessage("user", text);
  conversation.push({ role: "user", content: text });
  setBusy(true);
  const typing = addTyping();

  try {
    if (!API_URL || API_URL.includes("PASTE_YOUR_CLOUDFLARE")) {
      throw new Error("Setup needed: add your deployed Cloudflare Worker URL to app.js first.");
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: conversation })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `The service returned an error (${response.status}).`);
    }
    if (!data.reply || typeof data.reply !== "string") {
      throw new Error("The AI service returned an empty response. Please try again.");
    }

    typing.remove();
    conversation.push({ role: "assistant", content: data.reply });
    addMessage("assistant", data.reply);
  } catch (error) {
    typing.remove();
    const message = error && error.message ? error.message : "Something went wrong.";
    showError(message + " Your message remains in this tab; you can try sending it again.");
  } finally {
    setBusy(false);
    inputEl.focus();
  }
}

function showError(message) {
  const row = document.createElement("div");
  row.className = "error-note";
  row.textContent = message;
  messagesEl.appendChild(row);
  scrollToBottom();
}

function resizeInput() {
  inputEl.style.height = "auto";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 140) + "px";
}

sendButton.addEventListener("click", () => sendMessage(inputEl.value));
inputEl.addEventListener("input", () => {
  resizeInput();
  charCount.textContent = `${inputEl.value.length} / 4000`;
});
inputEl.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage(inputEl.value);
  }
});

document.querySelectorAll("[data-prompt]").forEach(button => {
  button.addEventListener("click", () => sendMessage(button.dataset.prompt));
});

document.getElementById("new-chat").addEventListener("click", () => {
  conversation = [];
  messagesEl.replaceChildren();
  welcomeEl.hidden = false;
  inputEl.value = "";
  charCount.textContent = "0 / 4000";
  resizeInput();
  closeSidebar();
  inputEl.focus();
});

function closeSidebar() {
  sidebar.classList.remove("open");
  scrim.classList.remove("show");
}
document.getElementById("mobile-menu").addEventListener("click", () => {
  sidebar.classList.add("open");
  scrim.classList.add("show");
});
scrim.addEventListener("click", closeSidebar);

// No localStorage: sensitive conversations are not persisted after this page is refreshed.
