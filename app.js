/* ============================================
   RIKSAN AI — Frontend App Logic
   ============================================ */

// ── State ──────────────────────────────────
const state = {
  conversations: JSON.parse(localStorage.getItem('riksan_convos') || '[]'),
  activeId: null,
  isLoading: false,
};

// ── DOM Refs ───────────────────────────────
const el = {
  chatArea: document.getElementById('chatArea'),
  messagesContainer: document.getElementById('messagesContainer'),
  welcomeScreen: document.getElementById('welcomeScreen'),
  messageInput: document.getElementById('messageInput'),
  sendBtn: document.getElementById('sendBtn'),
  charCount: document.getElementById('charCount'),
  chatList: document.getElementById('chatList'),
  newChatBtn: document.getElementById('newChatBtn'),
  clearBtn: document.getElementById('clearBtn'),
  modelSelect: document.getElementById('modelSelect'),
  topbarTitle: document.getElementById('topbarTitle'),
  menuBtn: document.getElementById('menuBtn'),
  sidebar: document.getElementById('sidebar'),
  sidebarOverlay: document.getElementById('sidebarOverlay'),
  searchInput: document.getElementById('searchInput'),
};

// ── Marked config ──────────────────────────
marked.setOptions({
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
  breaks: true,
  gfm: true,
});

// Custom renderer for code blocks
const renderer = new marked.Renderer();
renderer.code = (code, lang) => {
  const highlighted = lang && hljs.getLanguage(lang)
    ? hljs.highlight(code, { language: lang }).value
    : hljs.highlightAuto(code).value;
  const langLabel = lang || 'code';
  return `
    <div class="code-block-wrapper">
      <pre>
        <div class="code-header">
          <span>${langLabel}</span>
          <button class="copy-code-btn" onclick="copyCode(this)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2"/>
            </svg>
            Salin
          </button>
        </div>
        <code class="hljs language-${langLabel}">${highlighted}</code>
      </pre>
    </div>`;
};

marked.use({ renderer });

// ── Conversation Management ─────────────────

function saveConversations() {
  localStorage.setItem('riksan_convos', JSON.stringify(state.conversations));
}

function createConversation() {
  const id = Date.now().toString();
  const convo = { id, title: 'Percakapan Baru', messages: [], model: el.modelSelect.value, createdAt: Date.now() };
  state.conversations.unshift(convo);
  state.activeId = id;
  saveConversations();
  renderChatList();
  return convo;
}

function getActiveConversation() {
  return state.conversations.find(c => c.id === state.activeId);
}

function updateConversationTitle(id, firstMessage) {
  const convo = state.conversations.find(c => c.id === id);
  if (convo && convo.title === 'Percakapan Baru') {
    convo.title = firstMessage.slice(0, 40) + (firstMessage.length > 40 ? '…' : '');
    saveConversations();
    renderChatList();
    el.topbarTitle.textContent = convo.title;
  }
}

function switchConversation(id) {
  state.activeId = id;
  const convo = getActiveConversation();
  if (!convo) return;

  el.modelSelect.value = convo.model || 'kr/claude-sonnet-4.5';
  el.topbarTitle.textContent = convo.title;
  renderMessages(convo.messages);
  renderChatList();
  closeSidebar();
}

function deleteConversation(id, e) {
  e.stopPropagation();
  state.conversations = state.conversations.filter(c => c.id !== id);
  if (state.activeId === id) {
    state.activeId = null;
    showWelcome();
  }
  saveConversations();
  renderChatList();
}

// ── Render ──────────────────────────────────

function renderChatList(filter = '') {
  const filtered = filter
    ? state.conversations.filter(c => c.title.toLowerCase().includes(filter.toLowerCase()))
    : state.conversations;

  if (filtered.length === 0) {
    el.chatList.innerHTML = `<div class="chat-empty">Belum ada percakapan.<br/>Mulai chat baru!</div>`;
    return;
  }

  el.chatList.innerHTML = filtered.map(convo => `
    <div class="chat-item ${convo.id === state.activeId ? 'active' : ''}" onclick="switchConversation('${convo.id}')">
      <svg class="chat-item-icon" width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>
      <span class="chat-item-text">${escapeHtml(convo.title)}</span>
      <button class="msg-action-btn" onclick="deleteConversation('${convo.id}', event)" title="Hapus" style="padding:2px 6px;opacity:0.5;border:none;">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  `).join('');
}

function renderMessages(messages) {
  el.welcomeScreen.style.display = 'none';
  el.messagesContainer.classList.add('visible');

  el.messagesContainer.innerHTML = messages.map(msg => buildMessageHTML(msg)).join('');
  scrollToBottom();
}

function buildMessageHTML(msg) {
  const isUser = msg.role === 'user';
  const content = isUser
    ? `<div class="message-content">${escapeHtml(msg.content)}</div>`
    : `<div class="message-content">${marked.parse(msg.content)}</div>`;

  return `
    <div class="message-wrapper">
      <div class="message ${isUser ? 'user' : 'ai'}">
        <div class="message-avatar">${isUser ? 'R' : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'}</div>
        <div class="message-body">
          <div class="message-role">${isUser ? 'Kamu' : 'Riksan AI'}</div>
          ${content}
          ${!isUser ? `
            <div class="message-actions">
              <button class="msg-action-btn" onclick="copyMessage(this, ${JSON.stringify(msg.content).replace(/"/g, '&quot;')})">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2"/></svg>
                Salin
              </button>
            </div>` : ''}
        </div>
      </div>
    </div>`;
}

function showWelcome() {
  el.welcomeScreen.style.display = 'flex';
  el.messagesContainer.classList.remove('visible');
  el.messagesContainer.innerHTML = '';
  el.topbarTitle.textContent = 'Riksan AI';
}

function appendMessage(msg) {
  el.welcomeScreen.style.display = 'none';
  el.messagesContainer.classList.add('visible');
  el.messagesContainer.insertAdjacentHTML('beforeend', buildMessageHTML(msg));
  scrollToBottom();
}

function showTyping() {
  const div = document.createElement('div');
  div.className = 'message-wrapper';
  div.id = 'typingIndicator';
  div.innerHTML = `
    <div class="message ai">
      <div class="message-avatar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="message-body">
        <div class="message-role">Riksan AI</div>
        <div class="message-content">
          <div class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
          </div>
        </div>
      </div>
    </div>`;
  el.messagesContainer.appendChild(div);
  scrollToBottom();
}

function removeTyping() {
  document.getElementById('typingIndicator')?.remove();
}

// ── Send Message ────────────────────────────

async function sendMessage() {
  const text = el.messageInput.value.trim();
  if (!text || state.isLoading) return;

  // Ensure active conversation
  if (!state.activeId) createConversation();
  const convo = getActiveConversation();

  // Add user message
  const userMsg = { role: 'user', content: text };
  convo.messages.push(userMsg);
  appendMessage(userMsg);
  updateConversationTitle(convo.id, text);
  saveConversations();

  // Reset input
  el.messageInput.value = '';
  el.messageInput.style.height = 'auto';
  updateCharCount();
  setLoading(true);
  showTyping();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: el.modelSelect.value,
        messages: convo.messages,
      }),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Gagal mendapat respons');

    const aiMsg = { role: 'assistant', content: data.content };
    convo.messages.push(aiMsg);
    saveConversations();

    removeTyping();
    appendMessage(aiMsg);
  } catch (err) {
    removeTyping();
    const errMsg = { role: 'assistant', content: `⚠️ **Error:** ${err.message}\n\nPastikan API key sudah dikonfigurasi di Vercel environment variables.` };
    appendMessage(errMsg);
    showToast('Gagal: ' + err.message);
  } finally {
    setLoading(false);
  }
}

// ── UI Helpers ──────────────────────────────

function setLoading(val) {
  state.isLoading = val;
  el.sendBtn.disabled = val || !el.messageInput.value.trim();
  if (val) {
    el.sendBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
    el.sendBtn.classList.add('loading');
  } else {
    el.sendBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    el.sendBtn.classList.remove('loading');
  }
}

function updateCharCount() {
  const len = el.messageInput.value.length;
  el.charCount.textContent = `${len}/4000`;
  el.sendBtn.disabled = len === 0 || state.isLoading;
}

function scrollToBottom() {
  setTimeout(() => {
    el.chatArea.scrollTop = el.chatArea.scrollHeight;
  }, 50);
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

function copyCode(btn) {
  const code = btn.closest('pre').querySelector('code').innerText;
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = '✓ Tersalin';
    setTimeout(() => {
      btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2"/></svg> Salin`;
    }, 1500);
  });
}

function copyMessage(btn, content) {
  navigator.clipboard.writeText(content).then(() => {
    showToast('✓ Pesan disalin');
  });
}

function openSidebar() {
  el.sidebar.classList.add('open');
  el.sidebarOverlay.classList.add('show');
}

function closeSidebar() {
  el.sidebar.classList.remove('open');
  el.sidebarOverlay.classList.remove('show');
}

// ── Suggestion Cards ────────────────────────
document.querySelectorAll('.suggestion-card').forEach(card => {
  card.addEventListener('click', () => {
    el.messageInput.value = card.dataset.prompt;
    updateCharCount();
    sendMessage();
  });
});

// ── Event Listeners ─────────────────────────

el.messageInput.addEventListener('input', () => {
  updateCharCount();
  el.messageInput.style.height = 'auto';
  el.messageInput.style.height = Math.min(el.messageInput.scrollHeight, 180) + 'px';
});

el.messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

el.sendBtn.addEventListener('click', sendMessage);

el.newChatBtn.addEventListener('click', () => {
  createConversation();
  showWelcome();
  renderChatList();
  closeSidebar();
});

el.clearBtn.addEventListener('click', () => {
  if (!state.activeId) return;
  const convo = getActiveConversation();
  if (!convo) return;
  if (confirm('Hapus semua pesan di percakapan ini?')) {
    convo.messages = [];
    convo.title = 'Percakapan Baru';
    saveConversations();
    showWelcome();
    renderChatList();
    el.topbarTitle.textContent = 'Riksan AI';
  }
});

el.menuBtn.addEventListener('click', openSidebar);
el.sidebarOverlay.addEventListener('click', closeSidebar);

el.searchInput.addEventListener('input', (e) => {
  renderChatList(e.target.value);
});

el.modelSelect.addEventListener('change', () => {
  const convo = getActiveConversation();
  if (convo) {
    convo.model = el.modelSelect.value;
    saveConversations();
  }
});

// ── Init ────────────────────────────────────
renderChatList();
