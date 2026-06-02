document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chatForm');
    const userInput = document.getElementById('userInput');
    const chatBody = document.getElementById('chatBody');
    const modelSelect = document.getElementById('modelSelect');
    const activeModelBadge = document.getElementById('activeModelBadge');
    const toggleSidebar = document.getElementById('toggleSidebar');
    const sidebar = document.getElementById('sidebar');
    const newChatBtn = document.getElementById('newChatBtn');

    // Kloning struktur Welcome Screen ke memori agar bisa di-restore secara bersih saat tombol Obrolan Baru diklik
    const welcomeContainer = document.getElementById('welcomeContainer').cloneNode(true);

    let conversationHistory = [];
    let isGenerating = false;

    // Sinkronisasi badge text model aktif
    function updateModelBadge() {
        activeModelBadge.textContent = modelSelect.options[modelSelect.selectedIndex].text;
    }
    modelSelect.addEventListener('change', updateModelBadge);

    // Auto-resize kolom textarea input saat teks meluap
    function resizeTextarea() {
        userInput.style.height = 'auto';
        userInput.style.height = `${userInput.scrollHeight}px`;
    }
    userInput.addEventListener('input', resizeTextarea);

    // Sidebar Controller untuk Mobile View
    toggleSidebar.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('active') && !sidebar.contains(e.target) && !toggleSidebar.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    });

    // Event Delegation: Menghilangkan bug klik tidak merespon pada kartu rekomendasi prompt
    document.addEventListener('click', (e) => {
        const card = e.target.closest('.prompt-card');
        if (card) {
            const promptText = card.getAttribute('data-prompt');
            if (promptText && !isGenerating) {
                userInput.value = promptText;
                resizeTextarea();
                userInput.focus();
                // Trigger form submission secara terstruktur
                chatForm.dispatchEvent(new Event('submit', { cancelable: true }));
            }
        }
    });

    // Reset Chat / Membuat Workspace Sesi Baru secara Bersih
    newChatBtn.addEventListener('click', () => {
        if (isGenerating) return; // Kunci proteksi agar tidak merusak sesi jika AI sedang mengetik
        chatBody.innerHTML = '';
        chatBody.appendChild(welcomeContainer.cloneNode(true));
        conversationHistory = [];
        userInput.value = '';
        resizeTextarea();
        sidebar.classList.remove('active');
    });

    // Render Bubble Chat ke Layar
    function appendMessage(sender, text) {
        const currentWelcome = document.getElementById('welcomeContainer');
        if (currentWelcome) currentWelcome.remove();

        const messageRow = document.createElement('div');
        messageRow.classList.add('message-row', sender);

        const avatar = document.createElement('div');
        avatar.classList.add('msg-avatar');
        avatar.textContent = sender === 'user' ? 'U' : 'R';

        const content = document.createElement('div');
        content.classList.add('msg-content');
        content.textContent = text;

        messageRow.appendChild(avatar);
        messageRow.appendChild(content);
        chatBody.appendChild(messageRow);
        
        // Auto-scroll presisi ke baris pesan terbawah
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    // Render Animasi Loading Elipsis Berjalan (Premium Polished Continuous Animation)
    function appendLoadingIndicator() {
        const currentWelcome = document.getElementById('welcomeContainer');
        if (currentWelcome) currentWelcome.remove();

        const messageRow = document.createElement('div');
        messageRow.classList.add('message-row', 'ai', 'loading-indicator');

        const avatar = document.createElement('div');
        avatar.classList.add('msg-avatar');
        avatar.textContent = 'R';

        const content = document.createElement('div');
        content.classList.add('msg-content');
        content.innerHTML = `
            <div class="loading-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;

        messageRow.appendChild(avatar);
        messageRow.appendChild(content);
        chatBody.appendChild(messageRow);
        chatBody.scrollTop = chatBody.scrollHeight;
        
        return messageRow;
    }

    // Alur Integrasi API Utama (Submit Form)
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const text = userInput.value.trim();
        if (!text || isGenerating) return;

        // Nyalakan Kunci Pengiriman (Multitasking Protection Lock)
        isGenerating = true;
        
        // Tampilkan pesan user di UI
        appendMessage('user', text);
        
        // Bersihkan area input secara instan
        userInput.value = '';
        userInput.style.height = 'auto';

        // Daftarkan ke memori chat log agar AI mengingat konteks percakapan di atasnya
        conversationHistory.push({ role: 'user', content: text });

        // Tampilkan animasi loading elipsis
        const loadingBubble = appendLoadingIndicator();
        const selectedModel = modelSelect.value;

        try {
            // Tembak Serverless Proxy Vercel
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: selectedModel,
                    messages: conversationHistory
                })
            });

            const data = await response.json();
            
            // Hapus indikator loading setelah data mendarat
            if (loadingBubble && loadingBubble.parentNode) {
                loadingBubble.remove();
            }

            if (response.ok && data.choices && data.choices[0]?.message) {
                const aiResponse = data.choices[0].message.content;
                appendMessage('ai', aiResponse);
                
                // Daftarkan respon AI ke riwayat ingatan agar terus menyambung nyambung
                conversationHistory.push({ role: 'assistant', content: aiResponse });
            } else {
                const errorMessage = data.error || 'Terjadi gangguan upstream api pada server serverless.';
                appendMessage('ai', `⚠️ Error: ${errorMessage}`);
            }

        } catch (error) {
            if (loadingBubble && loadingBubble.parentNode) {
                loadingBubble.remove();
            }
            appendMessage('ai', `⚠️ Jaringan Error: ${error.message}`);
        } finally {
            // Buka kembali kunci state, aplikasi siap memproses obrolan selanjutnya tanpa macet
            isGenerating = false;
            userInput.focus();
        }
    });
});
