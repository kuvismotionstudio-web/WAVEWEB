# 🌊 WAVEWEB

<p align="center">
  <img src="assets/logowaveweb.png" alt="WAVEWEB" width="240">
</p>

> A modern, lightweight Chromium-based browser built on Electron — with a sleek dark UI, a built-in AI assistant, and a stack of features you won't find in a stock browser.

WAVEWEB is a custom browser designed for everyday work: fast, configurable, and packed with tools — from an ad blocker and article reader to a password manager and split-screen view.

---

## ✨ Highlights

### 🖼️ Interface & Browsing
- **Tabs with favicons** – tabbed browsing, vertical tabs, pinning, and grouping
- **Split View** – two panes side by side, each with its own URL bar, back/forward/reload, and a draggable divider
- **Reader Mode** – strip a page of ads and clutter, then read it in a clean view; copy the text or export it as `.txt`
- **Forced Dark Mode** – darken any page individually, even without native dark-mode support
- **Screenshots** – full page, region, or current view
- **Picture-in-Picture (PiP)** – float videos in a small always-on-top window
- **Weather widget** – on the new-tab page

### 🔒 Privacy & Security
- **Ad Blocker** – blocks ads and trackers, supports subscription lists, custom filters, and a whitelist
- **Incognito mode** – private tabs with no history saved
- **WavePass** – a built-in password manager with generator and autofill
- **Safety Screen** – default protection against unsafe sites

### 🤖 AI Assistant
- **Wave AI** – a sidebar assistant powered by OpenAI (GPT-4o mini)
  - Summarize pages in two clicks
  - Translate content on the fly
  - Ask questions about the current tab in context

### 🧰 Utilities
- **Notes** – quick in-browser jotting
- **Clipboard** – a history of what you copy
- **Downloads (Ctrl+J)** – a manager with progress bars
- **History (Ctrl+H)** and **Bookmarks (Ctrl+B)** with HTML export/import
- **Performance monitor** – view resource usage
- **User scripts** – inject your own CSS/JS (`userChrome`)
- **Sessions** – save and restore tab sets
- **Send to phone (QR)** – generate a QR code for the current page and open it on any device

---

## 🧭 Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl+T` | New tab |
| `Ctrl+W` | Close tab |
| `Ctrl+Shift+N` | New incognito tab |
| `Ctrl+R` / `F5` | Reload |
| `Alt+←` / `Alt+→` | Back / forward |
| `Ctrl+L` | Focus URL bar |
| `Ctrl+J` | Downloads |
| `Ctrl+H` | History |
| `Ctrl+B` | Bookmarks |
| `Ctrl+I` | Wave AI sidebar |
| `Ctrl+Shift+R` | Reader mode |
| `Ctrl+Shift+S` | Screenshot |
| `Ctrl+Shift+2` | Split view |
| `Ctrl+M` | Notes |
| `Ctrl+Shift+P` | WavePass (passwords) |
| `?` | Show all shortcuts |

---

## 🚀 Getting Started

Requirements: [Node.js](https://nodejs.org) with npm.

```bash
git clone https://github.com/kuvismotionstudio-web/WAVEWEB.git
cd WAVEWEB
npm install
npm start
```

Run in development mode with hot reload:

```bash
npm run dev
```

---

## 🏗️ Building a Release

```bash
# Build the Windows installer (NSIS, x64)
npm run build:win

# Build for other platforms
npm run build
npm run build:mac
npm run build:linux

# Build and publish directly to GitHub Releases (may require GH_TOKEN)
npm run publish
```

---

## ⚙️ Configuration

### AI Assistant
1. Click the AI button in the toolbar (or press `Ctrl+I`)
2. Enter your OpenAI API key (`sk-...`)
3. Start chatting with Wave AI

Get an API key at: <https://platform.openai.com/api-keys>

### Personalization
- **Accent themes** – pick your accent color (purple, blue, sea, red, orange)
- **Homepage & search engine** – set your own defaults
- **Downloads** – change the default save directory

---

## 🛠️ Built With

| Part | Technology |
| --- | --- |
| UI | Electron + HTML/CSS/JavaScript |
| Rendering engine | Chromium (WebView) |
| AI | OpenAI API |
| QR | Built-in offline (QR Code Generator, ECC L, versions 1–9) |
| Packaging | electron-builder (NSIS) |

---

## 📄 License

Project maintained under `kuvismotionstudio-web/WAVEWEB`. See [PRIVACY.md](./PRIVACY.md) for details about privacy and data handling.

---

Built with ❤️ by the AstroWorld team

© 2025-2026 AstroWorld. All rights reserved.