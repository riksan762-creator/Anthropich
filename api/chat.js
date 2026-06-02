export default async function handler(req, res) {
  // Atur CORS Header agar aman
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method tidak diizinkan' });
  }

  const { messages, model } = req.body;
  const apiKey = process.env.HIDEPULSA_API_KEY; // Diambil aman dari Env Vercel

  if (!apiKey) {
    return res.status(500).json({ error: 'API Key belum dikonfigurasi di Vercel.' });
  }

  try {
    const response = await fetch('https://ai.hidepulsa.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'claude-3-5-sonnet', // Default jika model tidak dipilih
        messages: messages,
        stream: false
      })
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
