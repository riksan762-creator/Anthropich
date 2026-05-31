# 🤖 Riksan AI

Chat interface premium berbasis Claude & GPT, powered by HIDEPULSA AI API.

## 📁 Struktur File

```
riksan-ai/
├── index.html          ← Frontend utama
├── style.css           ← Styling premium dark UI
├── app.js              ← Logic frontend (chat, history, dll)
├── api/
│   └── chat.js         ← Vercel serverless function (proxy API)
├── vercel.json         ← Konfigurasi Vercel
└── README.md
```

## 🚀 Deploy ke Vercel

### 1. Push ke GitHub

```bash
git init
git add .
git commit -m "Initial: Riksan AI"
git remote add origin https://github.com/USERNAME/riksan-ai.git
git push -u origin main
```

### 2. Import ke Vercel

- Buka [vercel.com](https://vercel.com)
- Klik **Add New → Project**
- Import repo `riksan-ai` dari GitHub
- Klik **Deploy**

### 3. Tambah Environment Variable

- Buka **Project Settings → Environment Variables**
- Tambah:
  - **Name:** `HIDEPULSA_API_KEY`
  - **Value:** `[API key kamu dari bot Telegram HIDEPULSA]`
  - **Environment:** Production + Preview + Development
- Klik **Save**
- Klik **Redeploy**

## ⚙️ Konfigurasi

### Ganti model default

Edit `app.js` line `modelSelect` atau ganti di `api/chat.js`:

```js
model = 'kr/claude-sonnet-4.5'  // default
```

### Model tersedia

- `kr/claude-opus-4.7` — Paling pintar
- `kr/claude-sonnet-4.5` — Balance (recommended)
- `kr/claude-haiku-4.5` — Tercepat
- `kr/deepseek-3.2` — Alternatif
- `cx/gpt-5.5` — GPT model

## 🔐 Keamanan

- API key **tidak pernah expose** ke frontend
- Semua request ke HIDEPULSA melalui serverless function
- Key disimpan aman di Vercel Environment Variables

## 🛠️ Local Development

```bash
npm i -g vercel
vercel dev
```

Tambah `.env.local`:

```
HIDEPULSA_API_KEY=your_api_key_here
```

-----

Made with ❤️ by Riksan
