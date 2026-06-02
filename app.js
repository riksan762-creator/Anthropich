const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const chatBody = document.getElementById('chatBody');
const modelSelect = document.getElementById('modelSelect');
const activeModelBadge = document.getElementById('activeModelBadge');
const welcomeContainer = document.getElementById('welcomeContainer');
const toggleSidebar = document.getElementById('toggleSidebar');
const sidebar = document.getElementById('sidebar');
const newChatBtn = document.getElementById('newChatBtn');

let conversationHistory = [];

// Sinkronisasi badge model saat diubah
modelSelect.addEventListener('change', (e) => {
    activeModelBadge.textContent = e.target.options[e.target.selectedIndex].text;
});

// Auto-resize textarea input
userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

// Toggle Sidebar pada Device Mobile
toggleSidebar.addEventListener('click', () => {
    sidebar.classList.toggle('active');
});

// Reset Chat Baru
newChatBtn.addEventListener('click', () => {
    chatBody.innerHTML = '';
    chatBody.appendChild(welcomeContainer);
    conversationHistory = [];
});

function setPrompt(text) {
    userInput.value = text;
    userInput.dispatchEvent(new Event('input'));
}

// Fungsi Append Chat Bubble ke Layar
function appendMessage(sender, text) {
    if (welcomeContainer) welcomeContainer.remove();
    
    const messageRow = document.createElement('div');
    messageRow.classList.add('message-row', sender);
    
    const avatar = document.createElement('div');
    avatar.classList.add('msg-avatar');
    avatar.innerHTML = sender === 'user' ? 'U' : 'R';
    
    const content = document.createElement('div');
    content.classList.add('msg-content');
    content.textContent = text;
    
    messageRow.appendChild(avatar);
    messageRow.appendChild(content);
    chatBody.appendChild(messageRow);
    chatBody.scrollTop = chatBody.scrollHeight;
}

// Kerangka Animasi Menunggu Respons (Loading State)
function appendLoadingIndicator() {
    const messageRow = document.createElement('div');
    messageRow.classList.add('message-row', 'ai', 'loading-indicator');
    messageRow.innerHTML = `
        <div class="msg-avatar">R</div>
        <div class="msg-content">
            <div class="loading-dots"><span></span><span></span><span></span></div>
        </div>
    `;
    chatBody.appendChild(messageRow);
    chatBody.scrollTop = chatBody.scrollHeight;
    return messageRow;
}

// Proses submit form
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const promptText = userInput.value.trim();
    if (!promptText) return;

    // Tampilkan di UI
    appendMessage('user', promptText);
    userInput.value = '';
    userInput.style.height = 'auto';

    // Simpan dalam history log
    conversationHistory.push({ role: 'user', content: promptText });

    // Munculkan indikator loading
    const loadingBubble = appendLoadingIndicator();
    const selectedModel = modelSelect.value;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: selectedModel,
                messages: conversationHistory
            })
        });

        const data = await response.json();
        loadingBubble.remove();

        if (data.choices && data.choices[0].message) {
            const aiResponse = data.choices[0].message.content;
            appendMessage('ai', aiResponse);
            conversationHistory.push({ role: 'assistant', content: aiResponse });
        } else {
            appendMessage('ai', 'Maaf, terjadi kesalahan struktur respons dari sistem upstream API.');
        }

    } catch (error) {
        loadingBubble.remove();
        appendMessage('ai', `Gagal terhubung ke server: ${error.message}`);
    }
});
