// ── State ──────────────────────────────────────────────────────────────────
let pendingImageData = null;

// ── DOM refs ────────────────────────────────────────────────────────────────
const messagesEl     = document.getElementById("chat-messages");
const inputEl        = document.getElementById("user-input");
const sendBtn        = document.getElementById("send-btn");
const fileInput      = document.getElementById("file-input");
const imgPreview     = document.getElementById("img-preview");
const imgPreviewWrap = document.getElementById("img-preview-wrap");
const imgClearBtn    = document.getElementById("img-clear");

const cameraBtn      = document.getElementById("camera-btn");
const cameraModal    = document.getElementById("camera-modal");
const cameraVideo    = document.getElementById("camera-video");
const cameraCapture  = document.getElementById("camera-capture-btn");
const cameraClose    = document.getElementById("camera-close-btn");
const cameraCanvas   = document.getElementById("camera-canvas");
let localMediaStream = null;

// ── Image upload ─────────────────────────────────────────────────────────────
function handleImageSelection(inputElement) {
  const file = inputElement.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    pendingImageData = e.target.result;
    imgPreview.src = pendingImageData;
    imgPreviewWrap.style.display = "flex";
  };
  reader.readAsDataURL(file);
}

if (fileInput) fileInput.addEventListener("change", () => handleImageSelection(fileInput));

if (cameraBtn) {
  cameraBtn.addEventListener("click", async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      cameraVideo.srcObject = stream;
      localMediaStream = stream;
      cameraModal.style.display = "flex";
    } catch (err) {
      alert("Nu am putut accesa camera web: " + err.message);
    }
  });
}

if (cameraClose) {
  cameraClose.addEventListener("click", () => {
    if (localMediaStream) {
      localMediaStream.getTracks().forEach(track => track.stop());
      localMediaStream = null;
    }
    cameraModal.style.display = "none";
  });
}

if (cameraCapture) {
  cameraCapture.addEventListener("click", () => {
    if (!localMediaStream) return;
    const context = cameraCanvas.getContext("2d");
    cameraCanvas.width = cameraVideo.videoWidth;
    cameraCanvas.height = cameraVideo.videoHeight;
    context.drawImage(cameraVideo, 0, 0, cameraCanvas.width, cameraCanvas.height);
    
    pendingImageData = cameraCanvas.toDataURL("image/jpeg", 0.9);
    imgPreview.src = pendingImageData;
    imgPreviewWrap.style.display = "flex";
    
    localMediaStream.getTracks().forEach(track => track.stop());
    localMediaStream = null;
    cameraModal.style.display = "none";
  });
}

imgClearBtn.addEventListener("click", () => {
  pendingImageData = null;
  if (fileInput) fileInput.value = "";
  imgPreviewWrap.style.display = "none";
  imgPreview.src = "";
});

// ── Trimitere mesaj cu streaming ─────────────────────────────────────────────
async function sendMessage(text) {
  if (!text.trim() && !pendingImageData) return;

  document.getElementById("ai-suggestions")?.remove();

  addMessage(text, "user", false, true, pendingImageData);

  const imageToSend = pendingImageData;
  pendingImageData = null;

  inputEl.value = "";
  autoResize();
  setLoading(true);
  showTyping();

  try {
    if (fileInput) fileInput.value = "";
    if (imgPreviewWrap) imgPreviewWrap.style.display = "none";
    if (imgPreview) imgPreview.src = "";

    const body = { message: text };
    if (imageToSend) body.image_data = imageToSend;

    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      removeTyping();
      addMessage(err.error || "Eroare de server. Încearcă din nou.", "bot", true);
      return;
    }

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
          if (chunk.clear) {
            rawText = "";
            if (bubble) bubble.innerHTML = "";
          }
          if (chunk.token) {
            if (!bubble) {
              removeTyping();
              bubble = createStreamBubble();
            }
            rawText += chunk.token;
            bubble.innerHTML = formatText(rawText);
            scrollToBottom();
          }
          if (chunk.done) {
            if (bubble && chunk.sources?.length) {
              const botWrapper = bubble.closest(".bot-message");
              if (botWrapper) showSources(botWrapper, chunk.sources);
            }
            if (chunk.suggestions?.length) {
              showSuggestions(chunk.suggestions);
            }
          }
        } catch { /* ignoră chunk-uri parțiale */ }
      }
    }

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
      <span class="typing-label">InsideUGAL Assistant scrie</span>
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

    if (/^-{3,}$/.test(line)) { closeList(); html += `<hr class="chunk-sep">`; continue; }
    if (!line) { if (!inOl && !inUl) html += `<div class="msg-spacer"></div>`; continue; }

    const mH2 = line.match(/^#{2,3}\s+(.*)/);
    if (mH2) { closeList(); html += `<div class="msg-h2">${inline(mH2[1])}</div>`; continue; }

    const mBold = line.match(/^\*\*(.*)\*\*$/);
    if (mBold) { closeList(); html += `<div class="msg-h2">${inline(mBold[1])}</div>`; continue; }

    const mSec = line.match(/^([A-E][\.\)]\s+)(.+)/);
    if (mSec) { closeList(); html += `<div class="msg-section"><span class="msg-sec-lbl">${mSec[1]}</span>${inline(mSec[2])}</div>`; continue; }

    if (/^[A-ZĂÂÎȘȚ\s]{6,}$/.test(line) && line.length < 80) {
      closeList(); html += `<div class="msg-h2">${inline(line)}</div>`; continue;
    }

    const mOl = line.match(/^(\d+)\.\s+(.*)/);
    if (mOl) {
      if (inUl) { html += "</ul>"; inUl = false; }
      if (!inOl) { html += `<ol>`; inOl = true; }
      html += `<li>${inline(mOl[2])}</li>`;
      continue;
    }

    const mUl = line.match(/^[-•*]\s+(.*)/);
    if (mUl) {
      if (inOl) { html += "</ol>"; inOl = false; }
      if (!inUl) { html += `<ul>`; inUl = true; }
      html += `<li>${inline(mUl[1])}</li>`;
      continue;
    }

    const mKv = line.match(/^([^:]{3,30}):\s+(.+)/);
    if (mKv && !inOl && !inUl) {
      html += `<p><strong>${inline(mKv[1])}:</strong> ${inline(mKv[2])}</p>`;
      continue;
    }

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

// ── Event listeners ──────────────────────────────────────────────────────────
sendBtn.addEventListener("click", () => sendMessage(inputEl.value));

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(inputEl.value); }
});

inputEl.addEventListener("input", autoResize);

document.querySelectorAll(".quick-btn").forEach(btn => {
  btn.addEventListener("click", () => sendMessage(btn.dataset.q));
});

