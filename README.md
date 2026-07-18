<div align="center">

```
██████╗  █████╗ ██████╗ ████████╗ ██████╗      ██╗██╗  ██╗████████╗ █████╗ 
██╔══██╗██╔══██╗██╔══██╗╚══██╔══╝██╔═══██╗     ██║╚██╗██╔╝╚══██╔══╝██╔══██╗
██████╔╝███████║██████╔╝   ██║   ██║   ██║     ██║ ╚███╔╝    ██║   ███████║
██╔══██╗██╔══██║██╔══██╗   ██║   ██║   ██║     ██║ ██╔██╗    ██║   ██╔══██║
██║  ██║██║  ██║██████╔╝   ██║   ╚██████╔╝     ██║██╔╝ ██╗   ██║   ██║  ██║
╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝    ╚═╝    ╚═════╝      ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝
```

**Instagram Data Extraction Tool**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![NPM Version](https://img.shields.io/npm/v/rabto-ixta.svg)](https://www.npmjs.com/package/rabto-ixta)
[![GitHub Stars](https://img.shields.io/github/stars/Priyanshuf1/rabto-ixta?style=social)](https://github.com/Priyanshuf1/rabto-ixta)

*Look up Instagram User IDs and explore similar account images — all from a sleek hacker-themed terminal UI.*

[🚀 Live Demo](https://rabto-ixta.vercel.app) · [📦 NPM Package](https://www.npmjs.com/package/rabto-ixta) · [🐛 Report Bug](https://github.com/Priyanshuf1/rabto-ixta/issues)

</div>

---

## ✨ Features

- 🔍 **Username → User ID Lookup** — Instantly resolve any Instagram username to its numeric ID
- 🖼️ **Similar Account Explorer** — Browse beautiful profile images from algorithmically similar accounts
- 🔑 **Bring Your Own Key (BYOK)** — Uses your personal free RapidAPI key — you pay nothing
- 🖥️ **Hacker Terminal UI** — Matrix-style dark interface with animated effects
- ⚡ **One Command Launch** — Run it locally with a single `npx` command
- 🌍 **Cloud Deployed** — Also available live on Vercel

---

## 🚀 Run It Locally in 30 Seconds

You don't need to clone anything. Just run this single command in your terminal:

```bash
npx rabto-ixta
```

Your browser will automatically open to `http://localhost:3002` with the full app running.

> **Requirements:** Node.js v18 or higher. [Download Node.js here](https://nodejs.org/)

### Install Globally (run anytime)

```bash
npm install -g rabto-ixta
rabto-ixta
```

---

## 🌐 Live on the Web

Access the tool without installing anything:

👉 **[https://rabto-ixta.vercel.app](https://rabto-ixta.vercel.app)**

---

## 🔑 Getting Your Free API Key

This tool uses the **FlashAPI1** Instagram API via RapidAPI (100% free on the Basic plan).

1. Visit [FlashAPI1 on RapidAPI](https://rapidapi.com/for-sharm/api/flashapi1)
2. Click **"Sign Up"** (free account — no credit card needed)
3. Click **"Subscribe"** on the **Basic** plan (Free, $0/month)
4. Go to the **"Authorization"** tab and copy your `X-RapidAPI-Key`
5. Paste it into the app when prompted

Every user gets **100 free requests/month** with their own key.

---


### Local Development

```bash
# 1. Clone the repo
git clone https://github.com/Priyanshuf1/rabto-ixta.git
cd rabto-ixta

# 2. Install all dependencies
npm run install-all

# 3. Start backend (Terminal 1)
npm run dev:backend

# 4. Start frontend (Terminal 2)
npm run dev:frontend

# 5. Open http://localhost:5173
```

---

## 📁 Project Structure

```
rabto-ixta/
├── api/
│   └── index.ts          # Vercel serverless function (Express app)
├── backend/
│   └── src/
│       └── server.ts     # Express backend (local dev & CLI)
├── frontend/
│   └── src/
│       ├── App.tsx        # Main React app with BYOK system
│       └── components/
│           ├── InstagramLookup.tsx   # Username → ID resolver
│           └── PhotoCarousel.tsx     # Similar accounts image carousel
├── cli.js                # CLI entry point (npx rabto-ixta)
├── vercel.json           # Vercel deployment config
└── package.json          # Root package with npm bin entry
```

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Vite, TailwindCSS |
| Backend | Node.js, Express, TypeScript |
| API | [FlashAPI1 via RapidAPI](https://rapidapi.com/for-sharm/api/flashapi1) |
| Deployment | Vercel (serverless) |
| CLI | Node.js ESM with auto browser-open |

---

## ⚠️ Disclaimer

This tool is built for educational and research purposes. It uses publicly available Instagram data through the RapidAPI platform. Always respect Instagram's Terms of Service and individual users' privacy.

---

## 👨‍💻 Author

**Priyanshu Awasthi**

- GitHub: [@Priyanshuf1](https://github.com/Priyanshuf1)

---

## 📄 License

MIT License — feel free to use, modify, and distribute.

---

<div align="center">
  <sub>Built with ❤️ by Priyanshu Awasthi</sub>
</div>
