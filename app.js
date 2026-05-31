/* ============================================
   RIKSAN AI — Optimized Frontend App Logic
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

// ── Marked & HLJS Config ──────────────────
marked.setOptions({
  gfm: true,
  breaks: true,
  headerIds: false,
  mangle: false,
  highlight: (code, lang) => {
    try {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    } catch (e) {
      return escapeHtml(code);
    }
  },
});

const renderer = new marked.Renderer();
renderer.code = (code, lang) => {
  const langLabel = lang || 'code';
  const highlighted = marked.options.highlight(code, lang);
  return `
    <div class="code-block-wrapper">
      <div class="code-header">
        <span>${langLabel}</span>
        <button class="copy-code-btn" onclick="copyCode(this)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2"/></svg>
          Salin
        </button>
      </div>
      <pre><code class="hljs language-${langLabel}">${highlighted}</code></pre>
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

// ── Render Logic ────────────────────────────

function renderChatList(filter = '') {
  const filtered = filter ? state.conversations.filter(c => c.title.toLowerCase().includes(filter.toLowerCase())) : state.conversations;
  el.chatList.innerHTML = filtered.length === 0 
    ? `<div class="chat-empty">Belum ada percakapan.</div>` 
    : filtered.map(convo => `
      <div class="chat-item ${convo.id === state.activeId ? 'active' : ''}" onclick="switchConversation('${convo.id}')">
        <span>${escapeHtml(convo.title)}</span>
        <button class="msg-action-btn" onclick="deleteConversation('${convo.id}', event)">✕</button>
      </div>`).join('');
}

function renderMessages(messages) {
  el.welcomeScreen.style.display = 'none';
  el.messagesContainer.classList.add('visible');
  
  // Menggunakan fragment untuk performa render yang lebih smooth
  const fragment = document.createDocumentFragment();
  messages.forEach(msg => {
    const div = document.createElement('div');
    div.innerHTML = buildMessageHTML(msg);
    fragment.appendChild(div.firstElementChild);
  });
  
  el.messagesContainer.innerHTML = '';
  el.messagesContainer.appendChild(fragment);
  scrollToBottom();
}

function buildMessageHTML(msg) {
  const isUser = msg.role === 'user';
  const content = isUser ? `<div class="message-content">${escapeHtml(msg.content)}</div>` : `<div class="message-content">${marked.parse(msg.content)}</div>`;
  return `<div class="message-wrapper"><div class="message ${isUser ? 'user' : 'ai'}"><div class="message-body">${content}</div></div></div>`;
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    el.chatArea.scrollTo({ top: el.chatArea.scrollHeight, behavior: 'smooth' });
  });
}

// ── Messaging ───────────────────────────────

async function sendMessage() {
  const text = el.messageInput.value.trim();
  if (!text || state.isLoading) return;

  if (!state.activeId) createConversation();
  const convo = getActiveConversation();
  
  const userMsg = { role: 'user', content: text };
  convo.messages.push(userMsg);
  appendMessage(userMsg);
  
  el.messageInput.value = '';
  setLoading(true);
  
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: el.modelSelect.value, messages: convo.messages }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal');

    const aiMsg = { role: 'assistant', content: data.content };
    convo.messages.push(aiMsg);
    saveConversations();
    appendMessage(aiMsg);
  } catch (err) {
    appendMessage({ role: 'assistant', content: `⚠️ **Error:** ${err.message}` });
  } finally {
    setLoading(false);
  }
}

function appendMessage(msg) {
  el.welcomeScreen.style.display = 'none';
  el.messagesContainer.insertAdjacentHTML('beforeend', buildMessageHTML(msg));
  scrollToBottom();
}

// ── Helpers ─────────────────────────────────

function setLoading(val) {
  state.isLoading = val;
  el.sendBtn.disabled = val;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function copyCode(btn) {
  const code = btn.closest('.code-block-wrapper').querySelector('code').innerText;
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = '✓ Tersalin';
    setTimeout(() => btn.innerHTML = 'Salin', 1500);
  });
}

// ── Init ────────────────────────────────────
renderChatList();
