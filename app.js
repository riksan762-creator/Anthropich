/* ============================================
   RIKSAN AI — app.js
   Streaming · Stop · Coding-capable · HideApi proxy
   ============================================ */

// ── Proxy endpoint (HideApi / Vercel) ──────
const API_ENDPOINT = '/api/chat';

// ── System prompt — paksa AI bisa coding ──
const SYSTEM_PROMPT = `Kamu adalah Riksan AI, asisten AI canggih yang dibuat oleh Riksan.

KEMAMPUAN UTAMA:
- Kamu WAJIB bisa coding dalam bahasa apapun: JavaScript, Python, HTML/CSS, TypeScript, PHP, Go, Rust, dll.
- Saat diminta membuat kode/app/fitur, SELALU berikan kode yang LENGKAP, BERFUNGSI, dan SIAP PAKAI — bukan contoh setengah-setengah.
- Kamu bisa multitasking: tangani beberapa permintaan sekaligus dalam satu respons.
- Saat debug: identifikasi masalah, jelaskan penyebabnya, dan berikan solusi kode yang diperbaiki.
- Untuk setiap kode yang kamu buat, tambahkan komentar singkat yang menjelaskan bagian penting.

FORMAT:
- Gunakan markdown dengan baik: heading, list, code block dengan bahasa yang tepat.
- Kode selalu di dalam \`\`\`bahasa ... \`\`\` block.
- Jawab dalam bahasa yang sama dengan pengguna (Indonesia atau Inggris).
- Jangan bertele-tele. Langsung ke inti jawaban.

KARAKTER:
- Cerdas, cepat, dan to-the-point.
- Jika ada yang tidak jelas, tanyakan sebelum menjawab.`;

// ── State ──────────────────────────────────
const state = {
  convos: JSON.parse(localStorage.getItem('riksan_v2') || '[]'),
  activeId: null,
  busy: false,
  abort: null,
};

// ── DOM ────────────────────────────────────
const el = {
  chatArea:    document.getElementById('chatArea'),
  feed:        document.getElementById('messagesContainer'),
  welcome:     document.getElementById('welcomeScreen'),
  input:       document.getElementById('messageInput'),
  sendBtn:     document.getElementById('sendBtn'),
  charCount:   document.getElementById('charCount'),
  chatList:    document.getElementById('chatList'),
  newChatBtn:  document.getElementById('newChatBtn'),
  clearBtn:    document.getElementById('clearBtn'),
  modelSelect: document.getElementById('modelSelect'),
  topTitle:    document.getElementById('topbarTitle'),
  topModel:    document.getElementById('topbarModel'),
  menuBtn:     document.getElementById('menuBtn'),
  sidebar:     document.getElementById('sidebar'),
  overlay:     document.getElementById('sidebarOverlay'),
  search:      document.getElementById('searchInput'),
};

// ── Marked setup ───────────────────────────
marked.setOptions({ breaks: true, gfm: true });

const mdRenderer = new marked.Renderer();
mdRenderer.code = function(code, lang) {
  let highlighted;
  try {
    highlighted = lang && hljs.getLanguage(lang)
      ? hljs.highlight(code, { language: lang }).value
      : hljs.highlightAuto(code).value;
  } catch { highlighted = code; }
  const label = lang || 'code';
  return `<div class="code-block-wrapper"><pre><div class="code-header"><span>${label}</span><button class="copy-code-btn" onclick="copyCode(this)"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2"/></svg> Salin</button></div><code class="hljs language-${label}">${highlighted}</code></pre></div>`;
};
marked.use({ renderer: mdRenderer });

// ── Conversation helpers ───────────────────

function save() { localStorage.setItem('riksan_v2', JSON.stringify(state.convos)); }

function newConvo() {
  const id = Date.now().toString();
  const c = { id, title: 'Percakapan Baru', msgs: [], model: el.modelSelect.value, ts: Date.now() };
  state.convos.unshift(c);
  state.activeId = id;
  save();
  renderList();
  return c;
}

function active() { return state.convos.find(c => c.id === state.activeId); }

function setTitle(id, text) {
  const c = state.convos.find(c => c.id === id);
  if (c && c.title === 'Percakapan Baru') {
    c.title = text.slice(0, 42) + (text.length > 42 ? '…' : '');
    save(); renderList();
    el.topTitle.textContent = c.title;
  }
}

function switchConvo(id) {
  stopGeneration();
  state.activeId = id;
  const c = active();
  if (!c) return;
  el.modelSelect.value = c.model || 'kr/claude-sonnet-4.5';
  el.topTitle.textContent = c.title;
  updateModelLabel();
  renderMessages(c.msgs);
  renderList();
  closeSidebar();
}

function deleteConvo(id, e) {
  e.stopPropagation();
  state.convos = state.convos.filter(c => c.id !== id);
  if (state.activeId === id) { state.activeId = null; showWelcome(); }
  save(); renderList();
}

// ── Render ─────────────────────────────────

function renderList(filter = '') {
  const list = filter
    ? state.convos.filter(c => c.title.toLowerCase().includes(filter.toLowerCase()))
    : state.convos;

  if (!list.length) {
    el.chatList.innerHTML = `<div class="chat-empty">Belum ada percakapan.<br>Klik + untuk mulai.</div>`;
    return;
  }
  el.chatList.innerHTML = list.map(c => `
    <div class="chat-item ${c.id === state.activeId ? 'active' : ''}" onclick="switchConvo('${c.id}')">
      <svg class="chat-item-icon" width="13" height="13" viewBox="0 0 24 24" fill="none">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>
      <span class="chat-item-text">${esc(c.title)}</span>
      <button class="chat-del-btn" onclick="deleteConvo('${c.id}', event)" title="Hapus">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>`).join('');
}

function renderMessages(msgs) {
  el.welcome.classList.add('hidden');
  el.feed.classList.add('visible');
  el.feed.innerHTML = msgs.map(m => buildRow(m)).join('');
  scrollBottom();
}

function buildRow(msg) {
  const isUser = msg.role === 'user';
  const content = isUser
    ? `<div class="msg-content">${esc(msg.content)}</div>`
    : `<div class="msg-content">${marked.parse(msg.content)}</div>`;

  const escapedContent = JSON.stringify(msg.content).replace(/"/g, '&quot;');

  return `
    <div class="msg-row">
      <div class="msg ${isUser ? 'user' : 'ai'}">
        <div class="msg-ava">${isUser
          ? 'R'
          : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        }</div>
        <div class="msg-body">
          <div class="msg-name">${isUser ? 'Kamu' : 'Riksan AI'}</div>
          ${content}
          ${!isUser ? `<div class="msg-actions">
            <button class="action-btn" onclick="copyMsg(${escapedContent})">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2"/></svg>
              Salin
            </button>
          </div>` : ''}
        </div>
      </div>
    </div>`;
}

function showWelcome() {
  el.welcome.classList.remove('hidden');
  el.feed.classList.remove('visible');
  el.feed.innerHTML = '';
  el.topTitle.textContent = 'Riksan AI';
}

function appendRow(msg) {
  el.welcome.classList.add('hidden');
  el.feed.classList.add('visible');
  el.feed.insertAdjacentHTML('beforeend', buildRow(msg));
  scrollBottom();
}

// Buat bubble streaming kosong, kembalikan elemen konten
function createStreamBubble() {
  el.welcome.classList.add('hidden');
  el.feed.classList.add('visible');
  const wrap = document.createElement('div');
  wrap.className = 'msg-row';
  wrap.id = 'streamRow';
  wrap.innerHTML = `
    <div class="msg ai">
      <div class="msg-ava">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="msg-body">
        <div class="msg-name">Riksan AI</div>
        <div class="msg-content" id="streamContent">
          <div class="typing-dots">
            <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
          </div>
        </div>
      </div>
    </div>`;
  el.feed.appendChild(wrap);
  scrollBottom();
  return document.getElementById('streamContent');
}

function finalizeStream(fullText) {
  const row = document.getElementById('streamRow');
  if (!row) return;
  row.removeAttribute('id');
  const contentEl = row.querySelector('.msg-content');
  contentEl.removeAttribute('id');
  contentEl.innerHTML = marked.parse(fullText);

  // Tambah action buttons
  const body = row.querySelector('.msg-body');
  const actions = document.createElement('div');
  actions.className = 'msg-actions';
  const escaped = JSON.stringify(fullText).replace(/"/g, '&quot;');
  actions.innerHTML = `
    <button class="action-btn" onclick="copyMsg(${escaped})">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
        <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2"/>
      </svg>
      Salin
    </button>`;
  body.appendChild(actions);
  scrollBottom();
}

// ── Send & Stream ──────────────────────────

async function sendMessage() {
  const text = el.input.value.trim();
  if (!text || state.busy) return;

  if (!state.activeId) newConvo();
  const convo = active();

  // Tambah pesan user
  const userMsg = { role: 'user', content: text };
  convo.msgs.push(userMsg);
  appendRow(userMsg);
  setTitle(convo.id, text);
  save();

  el.input.value = '';
  el.input.style.height = 'auto';
  updateChar();
  setBusy(true);

  const contentEl = createStreamBubble();
  let fullText = '';
  let started = false;

  state.abort = new AbortController();

  try {
    // Kirim ke proxy /api/chat dengan stream: true
    const res = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: convo.model || 'kr/claude-sonnet-4.5',
        stream: true,
        system: SYSTEM_PROMPT,
        max_tokens: 4096,
        messages: convo.msgs.map(m => ({ role: m.role, content: m.content })),
      }),
      signal: state.abort.signal,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}`);
    }

    // ── SSE stream reading ──
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop(); // simpan baris yang belum komplit

      for (const line of lines) {
        const l = line.trim();
        if (!l.startsWith('data:')) continue;
        const raw = l.slice(5).trim();
        if (raw === '[DONE]') continue;

        let parsed;
        try { parsed = JSON.parse(raw); } catch { continue; }

        // Format Anthropic SSE
        if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
          const token = parsed.delta.text || '';
          if (!token) continue;
          fullText += token;
          if (!started) {
            started = true;
            contentEl.innerHTML = '';
          }
          // Tampilkan raw text saat streaming + cursor kedip
          contentEl.innerHTML = esc(fullText) + '<span class="streaming-cursor"></span>';
          scrollBottom();
        }

        // Kalau proxy forward format OpenAI
        if (parsed.choices?.[0]?.delta?.content) {
          const token = parsed.choices[0].delta.content;
          fullText += token;
          if (!started) { started = true; contentEl.innerHTML = ''; }
          contentEl.innerHTML = esc(fullText) + '<span class="streaming-cursor"></span>';
          scrollBottom();
        }

        // Kalau proxy non-streaming (balas sekaligus)
        if (parsed.content && !parsed.type) {
          fullText = typeof parsed.content === 'string'
            ? parsed.content
            : parsed.content?.[0]?.text || '';
          started = true;
        }
      }
    }

    // Kalau proxy kirim JSON biasa (non-stream), fallback
    if (!started && !fullText) {
      throw new Error('Tidak ada respons dari server. Cek proxy /api/chat.');
    }

    finalizeStream(fullText);
    convo.msgs.push({ role: 'assistant', content: fullText });
    save();

  } catch (err) {
    const row = document.getElementById('streamRow');
    if (row) row.remove();

    if (err.name === 'AbortError') {
      // User stop — simpan apa yang sudah masuk
      if (fullText) {
        finalizeStream(fullText + '\n\n*(dihentikan)*');
        convo.msgs.push({ role: 'assistant', content: fullText + '\n\n*(dihentikan)*' });
        save();
      }
    } else {
      const errMsg = {
        role: 'assistant',
        content: `⚠️ **Error:** ${err.message}\n\nCek:\n- Proxy \`/api/chat\` sudah benar\n- Model yang dipilih tersedia di provider\n- Environment variable API key sudah diset`,
      };
      appendRow(errMsg);
      convo.msgs.push(errMsg);
      save();
      toast('Error: ' + err.message);
    }
  } finally {
    state.abort = null;
    setBusy(false);
  }
}

function stopGeneration() {
  if (state.abort) { state.abort.abort(); }
}

// ── UI helpers ─────────────────────────────

function setBusy(val) {
  state.busy = val;
  if (val) {
    el.sendBtn.disabled = false;
    el.sendBtn.classList.add('is-stop');
    el.sendBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>`;
    el.sendBtn.onclick = stopGeneration;
  } else {
    el.sendBtn.classList.remove('is-stop');
    el.sendBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    el.sendBtn.onclick = sendMessage;
    el.sendBtn.disabled = !el.input.value.trim();
  }
}

function updateChar() {
  const n = el.input.value.length;
  el.charCount.textContent = `${n} / 4000`;
  if (!state.busy) el.sendBtn.disabled = n === 0;
}

function updateModelLabel() {
  const opt = el.modelSelect.options[el.modelSelect.selectedIndex];
  if (el.topModel) el.topModel.textContent = opt ? opt.text : '';
}

function scrollBottom() {
  requestAnimationFrame(() => { el.chatArea.scrollTop = el.chatArea.scrollHeight; });
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

function copyCode(btn) {
  const code = btn.closest('pre').querySelector('code').innerText;
  navigator.clipboard.writeText(code).then(() => {
    const orig = btn.innerHTML;
    btn.textContent = '✓ Tersalin';
    setTimeout(() => { btn.innerHTML = orig; }, 1500);
  });
}

function copyMsg(content) {
  navigator.clipboard.writeText(content).then(() => toast('✓ Disalin'));
}

function openSidebar() { el.sidebar.classList.add('open'); el.overlay.classList.add('show'); }
function closeSidebar() { el.sidebar.classList.remove('open'); el.overlay.classList.remove('show'); }

// ── Events ─────────────────────────────────

el.input.addEventListener('input', () => {
  updateChar();
  el.input.style.height = 'auto';
  el.input.style.height = Math.min(el.input.scrollHeight, 180) + 'px';
});

el.input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    state.busy ? stopGeneration() : sendMessage();
  }
});

el.sendBtn.addEventListener('click', sendMessage);

el.newChatBtn.addEventListener('click', () => {
  stopGeneration();
  newConvo();
  showWelcome();
  renderList();
  closeSidebar();
});

el.clearBtn.addEventListener('click', () => {
  if (!state.activeId) return;
  const c = active();
  if (!c) return;
  if (confirm('Hapus semua pesan di percakapan ini?')) {
    c.msgs = []; c.title = 'Percakapan Baru';
    save(); showWelcome(); renderList();
    el.topTitle.textContent = 'Riksan AI';
  }
});

el.menuBtn.addEventListener('click', openSidebar);
el.overlay.addEventListener('click', closeSidebar);

el.search.addEventListener('input', e => renderList(e.target.value));

el.modelSelect.addEventListener('change', () => {
  updateModelLabel();
  const c = active();
  if (c) { c.model = el.modelSelect.value; save(); }
});

document.querySelectorAll('.prompt-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    el.input.value = btn.dataset.prompt;
    updateChar();
    sendMessage();
  });
});

// ── Init ───────────────────────────────────
renderList();
updateModelLabel();
