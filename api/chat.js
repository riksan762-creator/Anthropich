// api/chat.js — Vercel Serverless Function
// Proxy ke HIDEPULSA AI API dengan STREAMING
// API Key: HIDEPULSA_API_KEY di Vercel Environment Variables

export const config = {
  runtime: 'edge', // Edge runtime supaya streaming bisa jalan di Vercel
};

const SYSTEM_PROMPT = `Kamu adalah Riksan AI, asisten AI canggih yang dibuat oleh Riksan.

KEMAMPUAN UTAMA:
- Kamu WAJIB bisa coding dalam bahasa apapun: JavaScript, Python, HTML/CSS, TypeScript, PHP, Go, Rust, dll.
- Saat diminta membuat kode/app/fitur, SELALU berikan kode yang LENGKAP, BERFUNGSI, dan SIAP PAKAI — bukan contoh setengah-setengah.
- Kamu bisa multitasking: tangani beberapa permintaan sekaligus dalam satu respons.
- Saat debug: identifikasi masalah, jelaskan penyebabnya, dan berikan solusi kode yang diperbaiki.
- Untuk setiap kode yang kamu buat, tambahkan komentar singkat yang menjelaskan bagian penting.

FORMAT:
- Gunakan markdown: heading, list, code block dengan bahasa yang tepat.
- Kode selalu di dalam backtick block dengan nama bahasa.
- Jawab dalam bahasa yang sama dengan pengguna (Indonesia atau Inggris).
- Langsung ke inti jawaban, tidak bertele-tele.

KARAKTER:
- Cerdas, cepat, dan to-the-point.
- Jika ada yang tidak jelas, tanyakan sebelum menjawab.`;

export default async function handler(req) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.HIDEPULSA_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({
      error: 'API key tidak ditemukan. Tambahkan HIDEPULSA_API_KEY di Vercel Environment Variables.',
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Request body tidak valid' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const {
    model = 'kr/claude-sonnet-4.5',
    messages = [],
    stream = true,
    system,
  } = body;

  if (!messages.length) {
    return new Response(JSON.stringify({ error: 'Messages tidak boleh kosong' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  // Gabungkan system prompt: pakai dari client kalau ada, fallback ke default
  const systemContent = system || SYSTEM_PROMPT;

  // Sisipkan system sebagai pesan pertama (format OpenAI)
  const fullMessages = [
    { role: 'system', content: systemContent },
    ...messages,
  ];

  try {
    const upstream = await fetch('https://ai.hidepulsa.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: fullMessages,
        max_tokens: 4096,
        temperature: 0.7,
        stream: true, // SELALU stream ke hidepulsa
      }),
    });

    if (!upstream.ok) {
      // Coba baca error
      let errMsg = `HTTP ${upstream.status}`;
      try {
        const errData = await upstream.json();
        errMsg = errData?.error?.message || errData?.message || errMsg;
      } catch {}
      return new Response(JSON.stringify({ error: errMsg }), {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    if (stream) {
      // ── MODE STREAMING: terusin SSE langsung ke browser ──
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      // Pipe dari hidepulsa → browser
      (async () => {
        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buf += decoder.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop(); // simpan baris yang belum lengkap

            for (const line of lines) {
              const l = line.trim();
              if (!l) continue;

              // Terusin langsung ke client
              await writer.write(encoder.encode(line + '\n'));
            }
          }

          // Flush sisa buffer
          if (buf.trim()) {
            await writer.write(encoder.encode(buf + '\n'));
          }
          await writer.write(encoder.encode('data: [DONE]\n\n'));
        } catch (e) {
          console.error('[Stream pipe error]', e);
        } finally {
          writer.close();
        }
      })();

      return new Response(readable, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'X-Accel-Buffering': 'no',
          'Access-Control-Allow-Origin': '*',
        },
      });

    } else {
      // ── MODE NON-STREAM: kumpulkan semua lalu balas sekaligus ──
      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();

        for (const line of lines) {
          const l = line.trim();
          if (!l.startsWith('data:')) continue;
          const raw = l.slice(5).trim();
          if (raw === '[DONE]') continue;
          try {
            const parsed = JSON.parse(raw);
            const token = parsed?.choices?.[0]?.delta?.content || '';
            fullContent += token;
          } catch {}
        }
      }

      return new Response(JSON.stringify({ content: fullContent }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

  } catch (err) {
    console.error('[Riksan AI Proxy Error]', err);
    return new Response(JSON.stringify({
      error: 'Server error: ' + (err.message || 'Unknown'),
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
