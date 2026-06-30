/* ============================================================
   Maurice AI — Console IA TechCorp (filière DEV WEB)
   Chat en streaming connecté à Ollama. État vide centré,
   rail latéral, page paramètres, champ de points animé.
   ============================================================ */

const $ = (id) => document.getElementById(id);
const els = {
  app: $("app"), greeting: $("greeting"),
  modelSelect: $("modelSelect"), systemPrompt: $("systemPrompt"),
  temperature: $("temperature"), topp: $("topp"), numPredict: $("numPredict"),
  tempVal: $("tempVal"), toppVal: $("toppVal"), numPredVal: $("numPredVal"),
  messages: $("messages"), welcome: $("welcome"),
  input: $("input"), send: $("send"), stop: $("stop"),
  newChat: $("newChat"), themeBtn: $("themeBtn"),
  settingsBtn: $("settingsBtn"), settingsClose: $("settingsClose"),
};

const DEFAULT_SYSTEM =
  "You are a financial assistant specialized in helping financial analysts at TechCorp Industries. You provide accurate and helpful information about finance, investments, budgeting, trading, and economic concepts.";

const SKELETON_HTML = `
  <div class="thinking-tag">génération<span class="dots"><i></i><i></i><i></i></span></div>
  <div class="skeleton">
    <span class="sk-line" style="width:94%"></span>
    <span class="sk-line" style="width:81%"></span>
    <span class="sk-line" style="width:88%"></span>
    <span class="sk-line" style="width:46%"></span>
  </div>`;

let history = [];
let currentModel = null;
let isStreaming = false;
let controller = null;
let stick = true;

els.systemPrompt.value = DEFAULT_SYSTEM;

/* ---------- Accroche du jour ---------- */
const VERBS = ["explore", "avance", "construit", "décortique", "creuse"];
function setGreeting() {
  const h = new Date().getHours();
  const greet = h < 6 ? "Bonne nuit" : h < 18 ? "Bonjour" : "Bonsoir";
  const verb = VERBS[Math.floor(Math.random() * VERBS.length)];
  els.greeting.innerHTML = `${greet}, on <span class="accent">${verb}</span>&nbsp;?`;
}

/* ---------- Profils de modèle ---------- */
function profileFor(name) {
  const n = (name || "").toLowerCase();
  if (/med|health|clinic|sant/.test(n)) {
    return { system: "You are a careful medical information assistant. You provide general, educational health information. You are not a doctor and you always recommend consulting a qualified healthcare professional." };
  }
  return { system: DEFAULT_SYSTEM };
}
function applyProfile(name) { els.systemPrompt.value = profileFor(name).system; }

/* ---------- Chargement des modèles ---------- */
async function loadModels() {
  try {
    const r = await fetch("/api/status");
    const data = await r.json();
    if (data.connected && data.models?.length) populateModels(data.models);
    else if (!currentModel)
      els.modelSelect.innerHTML = `<option value="">${data.connected ? "Aucun modèle" : "Hors-ligne"}</option>`;
  } catch {
    if (!currentModel) els.modelSelect.innerHTML = '<option value="">Hors-ligne</option>';
  }
}
function populateModels(models) {
  const prev = currentModel;
  els.modelSelect.innerHTML = "";
  models.forEach((m) => {
    const o = document.createElement("option");
    o.value = m; o.textContent = m.replace(/:latest$/, "");
    els.modelSelect.appendChild(o);
  });
  if (prev && models.includes(prev)) {
    els.modelSelect.value = prev;
  } else {
    currentModel = models.find((m) => /financ|phi3/i.test(m)) || models[0];
    els.modelSelect.value = currentModel;
    applyProfile(currentModel);
  }
}
els.modelSelect.addEventListener("change", () => { currentModel = els.modelSelect.value; applyProfile(currentModel); });

/* ---------- Sliders ---------- */
const bind = (input, label) => input.addEventListener("input", () => (label.textContent = input.value));
bind(els.temperature, els.tempVal);
bind(els.topp, els.toppVal);
bind(els.numPredict, els.numPredVal);

/* ---------- Markdown minimal & sûr ---------- */
const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function renderMarkdown(text) {
  const blocks = [];
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    blocks.push(`<pre><code>${escapeHtml(code.replace(/\n$/, ""))}</code></pre>`);
    return ` ${blocks.length - 1} `;
  });
  text = escapeHtml(text);
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/^(?:[-*] .+(?:\n|$))+/gm, (b) =>
    `<ul>${b.trim().split("\n").map((l) => `<li>${l.replace(/^[-*]\s+/, "")}</li>`).join("")}</ul>`);
  text = text.replace(/^(?:\d+\. .+(?:\n|$))+/gm, (b) =>
    `<ol>${b.trim().split("\n").map((l) => `<li>${l.replace(/^\d+\.\s+/, "")}</li>`).join("")}</ol>`);
  text = text.split(/\n{2,}/).map((p) => (/^<(ul|ol|pre)/.test(p.trim()) ? p : `<p>${p.replace(/\n/g, "<br>")}</p>`)).join("");
  text = text.replace(/ (\d+) /g, (_, i) => blocks[i]);
  return text;
}

/* ---------- Scroll : stick-to-bottom ---------- */
const nearBottom = () => els.messages.scrollHeight - els.messages.scrollTop - els.messages.clientHeight < 90;
function scrollToBottom(force) { if (force || stick) els.messages.scrollTop = els.messages.scrollHeight; }
els.messages.addEventListener("scroll", () => { stick = nearBottom(); });

/* ---------- Messages ---------- */
function addMessage(role) {
  const wrap = document.createElement("div");
  wrap.className = `msg ${role}`;
  wrap.innerHTML = `<div class="bubble"><div class="bubble-body"></div></div>`;
  els.messages.appendChild(wrap);
  return wrap.querySelector(".bubble-body");
}

/* ---------- Envoi & streaming ---------- */
async function sendMessage(text) {
  text = text.trim();
  if (!text || isStreaming) return;
  if (!currentModel) { loadModels(); return; }

  els.app.classList.remove("empty");

  const userBody = addMessage("user");
  userBody.textContent = text;
  history.push({ role: "user", content: text });

  els.input.value = "";
  els.input.style.height = "auto";
  stick = true; scrollToBottom(true);
  setStreaming(true);

  const assistantBody = addMessage("assistant");
  assistantBody.innerHTML = SKELETON_HTML;
  scrollToBottom(true);

  let full = "", firstChunk = true;
  controller = new AbortController();
  try {
    const resp = await fetch("/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
      body: JSON.stringify({
        model: currentModel, messages: history, system: els.systemPrompt.value,
        options: { temperature: parseFloat(els.temperature.value), top_p: parseFloat(els.topp.value), num_predict: parseInt(els.numPredict.value, 10) },
      }),
    });
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        let obj; try { obj = JSON.parse(line); } catch { continue; }
        if (obj.error) { full += `\n\n⚠️ ${obj.error}`; continue; }
        const chunk = obj.message?.content || "";
        if (chunk) {
          if (firstChunk) firstChunk = false;
          full += chunk;
          assistantBody.innerHTML = renderMarkdown(full) + '<span class="cursor"></span>';
          scrollToBottom();
        }
      }
    }
  } catch (e) {
    if (e.name !== "AbortError") full += `\n\n⚠️ Erreur réseau : ${e.message}`;
  }

  assistantBody.innerHTML = renderMarkdown(full || "_(réponse vide)_");
  history.push({ role: "assistant", content: full });
  setStreaming(false);
  scrollToBottom();
}

function setStreaming(on) {
  isStreaming = on;
  els.send.hidden = on;
  els.stop.hidden = !on;
  els.send.disabled = on;
}
els.stop.addEventListener("click", () => { if (controller) controller.abort(); setStreaming(false); });

/* ---------- Saisie ---------- */
els.input.addEventListener("input", () => {
  els.input.style.height = "auto";
  els.input.style.height = Math.min(els.input.scrollHeight, 180) + "px";
});
els.input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(els.input.value); }
});
els.send.addEventListener("click", () => sendMessage(els.input.value));
document.querySelectorAll(".chip").forEach((c) => c.addEventListener("click", () => sendMessage(c.dataset.q)));

/* ---------- Nouvelle conversation ---------- */
function newConversation() {
  if (isStreaming && controller) controller.abort();
  history = [];
  els.messages.querySelectorAll(".msg").forEach((m) => m.remove());
  els.app.classList.add("empty");
  setGreeting();
  stick = true;
  setStreaming(false);
  els.input.focus();
}
els.newChat.addEventListener("click", newConversation);

/* ---------- Page paramètres (vue séparée) ---------- */
function openSettings() { els.app.classList.add("view-settings"); els.settingsBtn.classList.add("active"); }
function closeSettings() { els.app.classList.remove("view-settings"); els.settingsBtn.classList.remove("active"); }
els.settingsBtn.addEventListener("click", () =>
  els.app.classList.contains("view-settings") ? closeSettings() : openSettings());
els.settingsClose.addEventListener("click", closeSettings);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSettings(); });

/* ---------- Bascule de thème ---------- */
const THEME_KEY = "maurice-theme";
function applyTheme(t) { document.documentElement.dataset.theme = t; localStorage.setItem(THEME_KEY, t); }
els.themeBtn.addEventListener("click", () => {
  applyTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
});
applyTheme(localStorage.getItem(THEME_KEY) || "dark");

/* ============================================================
   Fond : animation ASCII (ondulations radiales, rampe de caractères).
   ============================================================ */
(function asciiField() {
  const field = document.getElementById("asciiField");
  if (!field) return;
  const RAMP = " ·∶+✦*◇○";
  let cols = 0, rows = 0, charW = 9, charH = 16;

  function measure() {
    const cs = getComputedStyle(field);
    const probe = document.createElement("span");
    probe.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font-family:${cs.fontFamily};font-size:${cs.fontSize};letter-spacing:${cs.letterSpacing};`;
    probe.textContent = "M".repeat(80);
    document.body.appendChild(probe);
    charW = probe.getBoundingClientRect().width / 80;
    probe.remove();
    charH = parseFloat(cs.fontSize) * 1.18;
    cols = Math.ceil(window.innerWidth / charW) + 1;
    rows = Math.ceil(window.innerHeight / charH) + 1;
  }

  function draw(t) {
    const cx = cols / 2, cy = rows * 0.44, maxr = Math.hypot(cx, cy);
    let out = "";
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const rad = Math.hypot(x - cx, y - cy);
        const v =
          Math.sin(x * 0.06 + t * 0.5) +
          Math.sin(y * 0.08 - t * 0.4) +
          Math.sin((x + y) * 0.045 + t * 0.3) +
          Math.sin(rad * 0.20 - t * 1.15);          // ondulations concentriques
        const n = (v + 4) / 8;                        // 0..1
        const d = n * (1.18 - (rad / maxr) * 0.95);   // densité plus forte au centre
        const idx = Math.max(0, Math.min(RAMP.length - 1, Math.floor(d * RAMP.length)));
        out += RAMP[idx];
      }
      out += "\n";
    }
    field.textContent = out;
  }

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let last = 0;
  function frame(ts) { if (ts - last > 55) { last = ts; draw(ts * 0.001); } requestAnimationFrame(frame); }
  measure();
  window.addEventListener("resize", () => { measure(); if (reduced) draw(0); });
  if (reduced) draw(0); else requestAnimationFrame(frame);
})();

/* ---------- Init ---------- */
setGreeting();
loadModels();
setInterval(loadModels, 10000);
