// ── State ──────────────────────────────────────────────────────────────────
let currentConvId = null;
let pendingImageData = null;   // base64 data URL al imaginii selectate

// ── DOM refs ────────────────────────────────────────────────────────────────
const messagesEl   = document.getElementById("chat-messages");
const inputEl      = document.getElementById("user-input");
const sendBtn      = document.getElementById("send-btn");
const newChatBtn   = document.getElementById("new-chat-btn");
const sidebarList  = document.getElementById("sidebar-list");
const sidebar      = document.getElementById("sidebar");
const toggleBtn    = document.getElementById("sidebar-toggle");
const imgInput     = document.getElementById("img-input");
const imgPreview   = document.getElementById("img-preview");
const imgPreviewWrap = document.getElementById("img-preview-wrap");
const imgClearBtn  = document.getElementById("img-clear");

// ── Sidebar toggle ──────────────────────────────────────────────────────────
toggleBtn.addEventListener("click", () => sidebar.classList.toggle("collapsed"));

// ── Image upload ─────────────────────────────────────────────────────────────
imgInput.addEventListener("change", () => {
  const file = imgInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    pendingImageData = e.target.result;
    imgPreview.src = pendingImageData;
    imgPreviewWrap.style.display = "flex";
  };
  reader.readAsDataURL(file);
});

imgClearBtn.addEventListener("click", () => {
  pendingImageData = null;
  imgInput.value = "";
  imgPreviewWrap.style.display = "none";
  imgPreview.src = "";
});

// ── Sidebar: carcă lista de conversații ─────────────────────────────────────
async function loadSidebar() {
  const res  = await fetch("/conversations");
  const list = await res.json();

  if (list.length === 0) {
    sidebarList.innerHTML = `<div class="sidebar-empty">Nicio conversație salvată încă.<br>Scrie primul mesaj!</div>`;
    return;
  }

  sidebarList.innerHTML = list.map(c => `
    <div class="conv-item ${c.id === currentConvId ? "active" : ""}" data-id="${c.id}">
      <div class="conv-info">
        <div class="conv-title">${escHtml(c.title)}</div>
        <div class="conv-date">${formatDate(c.updated_at)}</div>
      </div>
      <button class="conv-delete" data-id="${c.id}" title="Șterge">✕</button>
    </div>
  `).join("");

  sidebarList.querySelectorAll(".conv-item").forEach(el => {
    el.addEventListener("click", (e) => {
      if (e.target.classList.contains("conv-delete")) return;
      openConversation(el.dataset.id);
    });
  });

  sidebarList.querySelectorAll(".conv-delete").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteConversation(btn.dataset.id);
    });
  });
}

// ── Deschide o conversație existentă ────────────────────────────────────────
async function openConversation(convId) {
  const res  = await fetch(`/conversations/${convId}`);
  const conv = await res.json();

  currentConvId = conv.id;
  renderMessages(conv.messages);
  await loadSidebar();
  scrollToBottom();

  if (window.innerWidth <= 640) sidebar.classList.add("collapsed");
}

// ── Afișează mesajele unei conversații ──────────────────────────────────────
function renderMessages(messages) {
  messagesEl.innerHTML = "";

  if (messages.length === 0) {
    renderWelcome();
    return;
  }

  messages.forEach(m => addMessage(m.content, m.role, false, false, null));
}

function renderWelcome() {
  messagesEl.innerHTML = `
    <div class="message bot-message">
      <div class="message-avatar">🎓</div>
      <div class="message-bubble">
        <p>Bună ziua! Sunt asistentul virtual al <strong>FACIEE</strong> din Galați.</p>
        <p>Te pot ajuta cu informații despre:</p>
        <ul>
          <li>📚 Programe de studiu (Licență &amp; Master)</li>
          <li>📝 Admitere și dosare</li>
          <li>💰 Taxe și burse</li>
          <li>🔬 Laboratoare și infrastructură</li>
          <li>📞 Contact și secretariat</li>
        </ul>
        <p>Cu ce te pot ajuta?</p>
      </div>
    </div>`;
}

// ── Conversație nouă ─────────────────────────────────────────────────────────
newChatBtn.addEventListener("click", () => {
  currentConvId = null;
  renderWelcome();
  loadSidebar();
  inputEl.focus();
  if (window.innerWidth <= 640) sidebar.classList.add("collapsed");
});

// ── Șterge conversație ──────────────────────────────────────────────────────
async function deleteConversation(convId) {
  await fetch(`/conversations/${convId}`, { method: "DELETE" });
  if (currentConvId === convId) {
    currentConvId = null;
    renderWelcome();
  }
  await loadSidebar();
}

// ── Trimitere mesaj cu streaming ─────────────────────────────────────────────
async function sendMessage(text) {
  if (!text.trim() && !pendingImageData) return;

  // Șterge sugestiile existente la fiecare mesaj nou
  document.getElementById("ai-suggestions")?.remove();

  addMessage(text, "user", false, true, pendingImageData);

  const imageToSend = pendingImageData;
  pendingImageData = null;

  // setLoading + showTyping cât mai devreme — înainte de orice DOM care poate arunca
  inputEl.value = "";
  autoResize();
  setLoading(true);
  showTyping();

  try {
    // Cleanup imagine — cu null-guard pentru siguranță
    if (imgInput) imgInput.value = "";
    if (imgPreviewWrap) imgPreviewWrap.style.display = "none";
    if (imgPreview) imgPreview.src = "";

    const body = { message: text, conv_id: currentConvId };
    if (imageToSend) body.image_data = imageToSend;

    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    // Eroare înainte de stream (ex: 503)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      removeTyping();
      addMessage(err.error || "Eroare de server. Încearcă din nou.", "bot", true);
      return;
    }

    // NU scoatem typing-ul încă — îl scoatem doar când vine primul token
    let bubble = null;
    let rawText = "";

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const dataStr = line.slice(6).trim();
        if (!dataStr) continue;
        try {
          const chunk = JSON.parse(dataStr);
          if (chunk.token) {
            // Primul token — scoatem typing-ul și creăm bula de răspuns
            if (!bubble) {
              removeTyping();
              bubble = createStreamBubble();
            }
            rawText += chunk.token;
            bubble.innerHTML = formatText(rawText);
            scrollToBottom();
          }
          if (chunk.done) {
            currentConvId = chunk.conv_id;
            if (bubble && chunk.sources?.length) {
              const botWrapper = bubble.closest(".bot-message");
              if (botWrapper) showSources(botWrapper, chunk.sources);
            }
            if (chunk.suggestions?.length) {
              showSuggestions(chunk.suggestions);
            }
            await loadSidebar();
          }
        } catch { /* ignoră chunk-uri parțiale */ }
      }
    }

    // Dacă am primit done fără niciun token (fallback FAQ)
    if (!bubble) removeTyping();
  } catch {
    removeTyping();
    addMessage("Eroare de conexiune. Verifică că serverul rulează și încearcă din nou.", "bot", true);
  } finally {
    setLoading(false);
    inputEl.focus();
  }
}

function createStreamBubble() {
  const wrapper = document.createElement("div");
  wrapper.className = "message bot-message";
  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = "🎓";
  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  wrapper.appendChild(avatar);
  wrapper.appendChild(bubble);
  messagesEl.appendChild(wrapper);
  scrollToBottom();
  return bubble;
}

// ── Helpers UI ───────────────────────────────────────────────────────────────
function addMessage(text, role, isError = false, animate = true, imageData = null) {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${role === "user" ? "user-message" : "bot-message"}${isError ? " error-message" : ""}`;

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = role === "user" ? "👤" : "🎓";

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";

  if (imageData) {
    const img = document.createElement("img");
    img.src = imageData;
    img.className = "msg-image";
    bubble.appendChild(img);
  }

  if (text) {
    const textDiv = document.createElement("div");
    textDiv.innerHTML = formatText(text);
    bubble.appendChild(textDiv);
  }

  wrapper.appendChild(avatar);
  wrapper.appendChild(bubble);
  if (!animate) wrapper.style.animation = "none";
  messagesEl.appendChild(wrapper);
  scrollToBottom();
}

function showSources(botWrapper, sources) {
  const block = document.createElement("div");
  block.className = "sources-block";
  const tags = sources
    .map(s => `<span class="source-tag">${escHtml(s.replace(/\.txt$/i, "").replace(/_/g, " "))}</span>`)
    .join(" ");
  block.innerHTML = `<span class="sources-label">Surse:</span> ${tags}`;
  botWrapper.querySelector(".message-bubble").appendChild(block);
}

function showSuggestions(questions) {
  document.getElementById("ai-suggestions")?.remove();
  const div = document.createElement("div");
  div.id = "ai-suggestions";
  div.className = "suggestion-chips";
  questions.forEach(q => {
    const btn = document.createElement("button");
    btn.className = "suggestion-btn";
    btn.textContent = q;
    btn.addEventListener("click", () => {
      div.remove();
      // setTimeout(0) asigură că sendMessage pornește după ce event loop-ul curent e gol
      setTimeout(() => sendMessage(q), 0);
    });
    div.appendChild(btn);
  });
  messagesEl.appendChild(div);
  scrollToBottom();
}

function showTyping() {
  const wrapper = document.createElement("div");
  wrapper.className = "message bot-message";
  wrapper.id = "typing";
  wrapper.innerHTML = `
    <div class="message-avatar">🎓</div>
    <div class="message-bubble typing-bubble">
      <span class="typing-label">FACIEE Assistant scrie</span>
      <div class="typing-dots"><span></span><span></span><span></span></div>
    </div>`;
  messagesEl.appendChild(wrapper);
  scrollToBottom();
}

function removeTyping() {
  document.getElementById("typing")?.remove();
}

function setLoading(on) {
  sendBtn.disabled = on;
  inputEl.disabled = on;
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function autoResize() {
  inputEl.style.height = "auto";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + "px";
}

function formatText(raw) {
  const esc = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const lines = esc.split("\n");
  let html = "";
  let inOl = false;
  let inUl = false;

  const closeList = () => {
    if (inOl) { html += "</ol>"; inOl = false; }
    if (inUl) { html += "</ul>"; inUl = false; }
  };

  for (const raw of lines) {
    const line = raw.trim();

    // Separator ---
    if (/^-{3,}$/.test(line)) {
      closeList();
      html += `<hr class="chunk-sep">`;
      continue;
    }

    // Linie goală
    if (!line) {
      if (!inOl && !inUl) html += `<div class="msg-spacer"></div>`;
      continue;
    }

    // Markdown headers ##
    const mH2 = line.match(/^#{2,3}\s+(.*)/);
    if (mH2) { closeList(); html += `<div class="msg-h2">${inline(mH2[1])}</div>`; continue; }

    // Bold **text**
    const mBold = line.match(/^\*\*(.*)\*\*$/);
    if (mBold) { closeList(); html += `<div class="msg-h2">${inline(mBold[1])}</div>`; continue; }

    // Secțiune tip "A. Titlu" sau "A) Titlu"
    const mSec = line.match(/^([A-E][\.\)]\s+)(.+)/);
    if (mSec) { closeList(); html += `<div class="msg-section"><span class="msg-sec-lbl">${mSec[1]}</span>${inline(mSec[2])}</div>`; continue; }

    // Titlu tip "TEMATICA..." sau "PROGRAM..." (toate caps, > 6 chars)
    if (/^[A-ZĂÂÎȘȚ\s]{6,}$/.test(line) && line.length < 80) {
      closeList(); html += `<div class="msg-h2">${inline(line)}</div>`; continue;
    }

    // Listă numerotată "1. text" sau "10. text"
    const mOl = line.match(/^(\d+)\.\s+(.*)/);
    if (mOl) {
      if (inUl) { html += "</ul>"; inUl = false; }  // închide ul dacă era deschis
      if (!inOl) { html += `<ol>`; inOl = true; }   // deschide ol O singură dată
      html += `<li>${inline(mOl[2])}</li>`;
      continue;
    }

    // Listă cu buline "- text" sau "• text"
    const mUl = line.match(/^[-•*]\s+(.*)/);
    if (mUl) {
      if (inOl) { html += "</ol>"; inOl = false; }  // închide ol dacă era deschis
      if (!inUl) { html += `<ul>`; inUl = true; }   // deschide ul O singură dată
      html += `<li>${inline(mUl[1])}</li>`;
      continue;
    }

    // Linie cu "Cheie: valoare"
    const mKv = line.match(/^([^:]{3,30}):\s+(.+)/);
    if (mKv && !inOl && !inUl) {
      html += `<p><strong>${inline(mKv[1])}:</strong> ${inline(mKv[2])}</p>`;
      continue;
    }

    // Text normal
    closeList();
    html += `<p>${inline(line)}</p>`;
  }

  closeList();
  return html;
}

function inline(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
}

function escHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit" });
}

// ── Event listeners ──────────────────────────────────────────────────────────
sendBtn.addEventListener("click", () => sendMessage(inputEl.value));

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(inputEl.value); }
});

inputEl.addEventListener("input", autoResize);

document.querySelectorAll(".quick-btn").forEach(btn => {
  btn.addEventListener("click", () => sendMessage(btn.dataset.q));
});

// ── Init ─────────────────────────────────────────────────────────────────────
loadSidebar();
