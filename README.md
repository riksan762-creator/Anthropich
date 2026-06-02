<div align="center">

  <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Robot.png" alt="Robot" width="90" height="90" />

  # 🌌 Riksan AI — Universal Intelligence Platform

  **An elegant, enterprise-grade AI Chat interface built for high-performance multitasking.**  
  *Powered by HIDEPULSA AI Universal API Ecosystem.*

  [![Vercel Deployment](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)
  [![GitHub License](https://img.shields.io/badge/License-MIT-58a6ff?style=for-the-badge)](https://github.com)
  [![Platform Compatibility](https://img.shields.io/badge/Engine-OpenAI%20%26%20Anthropic-orange?style=for-the-badge)](https://ai.hidepulsa.com)

  <p align="center">
    <a href="#-fitur-utama">Fitur Utama</a> •
    <a href="#-arsitektur-keamanan">Arsitektur</a> •
    <a href="#-panduan-instalasi">Instalasi</a> •
    <a href="#-langkah-deployment">Deployment</a>
  </p>
</div>

---

## 🌟 Fitur Utama

Riksan AI dirancang untuk memberikan pengalaman interaksi AI yang mulus, cepat, dan aman dengan tampilan premium mirip ChatGPT.

*   **🤖 Dual-Engine Compatibility:** Akses langsung ke 37+ model AI mutakhir (termasuk lini Claude 3.5 Sonnet, Claude Opus, GPT-4o, hingga OpenAI o1-mini) hanya menggunakan satu basis API.
*   **⚡ Multitasking & Responsive UI:** Antarmuka *Dark Mode* adaptif yang dioptimalkan untuk perangkat mobile maupun desktop dengan transisi yang halus.
*   **🔒 Zero Client-Side Leakage:** Keamanan API Key tingkat tinggi melalui arsitektur enkapsulasi fungsi serverless.
*   **🚀 Instant Prompting:** Dilengkapi dengan pintasan kartu rekomendasi perintah untuk mempercepat alur kerja *Coding* dan *Architecture*.

---

## 🛡️ Arsitektur Keamanan (Vercel Serverless)

Aplikasi ini menggunakan metode **Reverse Proxy** berbasis serverless. Kunci API Anda tidak akan pernah tersentuh oleh browser pengguna, mencegah eksploitasi kuota oleh pihak ketiga.

```mermaid
graph LR
    Browser[Frontend UI] -- Request Tanpa Key --> Vercel[Vercel Serverless Function]
    Vercel -- Injeksi HIDEPULSA_API_KEY --> Hidepulsa[HIDEPULSA AI Endpoint]
    Hidepulsa --> Vercel --> Browser
