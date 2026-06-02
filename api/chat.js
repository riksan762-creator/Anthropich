export default async function handler(req, res) {
  // Hanya izinkan metode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { messages, model } = req.body;
    const apiKey = process.env.HIDEPULSA_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'API Key belum dikonfigurasi di Vercel!' });
    }

    // Menggunakan OpenAI-compatible endpoint dari HIDEPULSA AI
    const response = await fetch('https://ai.hidepulsa.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'gpt-4o', // Model default jika tidak dipilih
        messages: messages,
        temperature: 0.7
      })
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Terjadi kesalahan pada server: ' + error.message });
  }
}
