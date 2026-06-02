const messagesContainer = document.getElementById('messagesContainer');
const welcomeScreen = document.getElementById('welcomeScreen');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const modelSelect = document.getElementById('modelSelect');
const newChatBtn = document.getElementById('newChatBtn');

let conversationHistory = [];

// Auto-grow input textarea
userInput.addEventListener('input', () => {
  userInput.style.height = 'auto';
  userInput.style.height = userInput.scrollHeight + 'px';
  sendBtn.disabled = userInput.value.trim() === '';
});

// Send actions
sendBtn.addEventListener('click', handleSend);
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

newChatBtn.addEventListener('click', resetChat);

function quickAction(text) {
  userInput.value = text;
  sendBtn.disabled = false;
  handleSend();
}

async function handleSend() {
  const query = userInput.value.trim();
  if (!query) return;

  // Sembunyikan layar utama jika pesan pertama
  if (welcomeScreen) welcomeScreen.style.display = 'none';

  // Render User Message
  appendMessage(query, 'user');
  userInput.value = '';
  userInput.style.height = 'auto';
  sendBtn.disabled = true;

  // Masukkan ke history percakapan
  conversationHistory.push({ role: 'user', content: query });

  // Render Bot Loading Skeleton
  const botMessageId = appendMessage('<i class="fa-solid fa-spinner fa-spin"></i> Merespons...', 'assistant');

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelSelect.value,
        messages: conversationHistory
      })
    });

    const data = await response.json();
    
    if (response.ok && data.choices) {
      const aiResponse = data.choices[0].message.content;
      conversationHistory.push({ role: 'assistant', content: aiResponse });
      
      // Update element dengan parser code block
      updateMessage(botMessageId, formatMarkdown(aiResponse));
    } else {
      updateMessage(botMessageId, `⚠️ Gagal memuat data: ${data.error || 'Unknown Error'}`);
    }
  } catch (err) {
    updateMessage(botMessageId, `❌ Terjadi Error Koneksi: ${err.message}`);
  }
}

function appendMessage(text, sender) {
  const msgId = 'msg-' + Date.now();
  const row = document.createElement('div');
  row.className = `message-row ${sender}`;
  
  const avatar = sender === 'user' ? 'U' : 'AI';
  const icon = sender === 'user' ? '<i class="fa-regular fa-user"></i>' : '<i class="fa-solid fa-wand-magic-sparkles"></i>';

  row.innerHTML = `
    <div class="msg-avatar">${icon}</div>
    <div class="msg-bubble" id="${msgId}">${text}</div>
  `;
  
  messagesContainer.appendChild(row);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  return msgId;
}

function updateMessage(id, newHtml) {
  const target = document.getElementById(id);
  if (target) {
    target.innerHTML = newHtml;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

// Simple Parser untuk mendeteksi block code (```) agar rapi
function formatMarkdown(text) {
  let escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  
  // Regex parsing block code
  const codeBlockRegex = /```([\s\S]*?)```/g;
  escaped = escaped.replace(codeBlockRegex, (match, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  // Regex line breaks ganti ke <br>
  return escaped.replace(/\n/g, '<br>');
}

function resetChat() {
  conversationHistory = [];
  messagesContainer.innerHTML = '';
  if (welcomeScreen) messagesContainer.appendChild(welcomeScreen);
  welcomeScreen.style.display = 'block';
}
