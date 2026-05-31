// api/chat.js — Vercel Serverless Function
// Proxy ke HIDEPULSA AI API
// API Key disimpan di Vercel Environment Variables: HIDEPULSA_API_KEY

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.HIDEPULSA_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'API key tidak ditemukan. Tambahkan HIDEPULSA_API_KEY di Vercel Environment Variables.',
    });
  }

  try {
    const { model = 'kr/claude-sonnet-4.5', messages = [] } = req.body;

    if (!messages || messages.length === 0) {
      return res.status(400).json({ error: 'Messages tidak boleh kosong' });
    }

    const response = await fetch('https://ai.hidepulsa.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 4096,
        temperature: 0.7,
        stream: false,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message || data?.message || 'Gagal menghubungi AI API';
      return res.status(response.status).json({ error: errMsg });
    }

    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({ error: 'Respons API tidak valid' });
    }

    return res.status(200).json({ content });

  } catch (err) {
    console.error('[Riksan AI API Error]', err);
    return res.status(500).json({
      error: 'Terjadi kesalahan server: ' + (err.message || 'Unknown error'),
    });
  }
}
