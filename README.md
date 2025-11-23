# 🇦🇿 Wiki Loves Monuments Azerbaijan - Interactive Map

![WLMAZ Project Banner](./public/wlm-az.png)

![GitHub License](https://img.shields.io/github/license/nemoralis/wlmaz)
![Contributors](https://img.shields.io/github/contributors/nemoralis/wlmaz?color=dark-green) ![Stargazers](https://img.shields.io/github/stars/nemoralis/wlmaz?style=social) 
![Issues](https://img.shields.io/github/issues/nemoralis/wlmaz) 
![GitHub Sponsors](https://img.shields.io/github/sponsors/nemoralis) 


**WLMAZ** is a full-stack mapping application designed to help contributors discover heritage monuments in Azerbaijan and upload photos directly to Wikimedia Commons.

It features a responsive, clustered map interface powered by Vue 3 and Leaflet, backed by a secure Node.js proxy that handles MediaWiki OAuth authentication and uploads.


## ✨ Features

### 🗺️ Interactive Map
* **High-Performance Clustering:** Handles thousands of monument points using `Leaflet.markercluster` with chunked loading.
* **Visual Status:** Markers are color-coded (Green = Has Image, Blue = Needs Image).
* **Deep Linking:** Share specific monuments via URL parameters (e.g., `?inventory=4810`).
* **Responsive Sidebar:** Detailed view of monuments using `leaflet-sidebar-v2`, fully optimized for mobile devices.
* **Rich Metadata:** Displays Wikidata IDs, Wikipedia links, and automatic image credits.

### 🔐 Authentication & Uploads
* **MediaWiki OAuth 1.0a:** Secure login using existing Wikimedia accounts.
* **Direct Uploads:** Upload photos to Wikimedia Commons directly from the interface.
* **Session Management:** Supports both Memory (Dev) and Redis (Production) session stores.


## 🚀 Getting Started

### Prerequisites
* **Node.js:** v20.6.0 or higher (Required for `--env-file` support).
* **pnpm:** Recommended package manager.
* **Docker:** For running Redis locally.

### 1. Clone & Install
```bash
git clone https://github.com/nemoralis/wlmaz.git
cd wlmaz
pnpm install
```

### 2. Environment Setup

Create a `.env` file in the root directory:
```bash
PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Authentication (Get these from Special:OAuthConsumerRegistration on Commons)
WM_CONSUMER_KEY=your_consumer_key
WM_CONSUMER_SECRET=your_consumer_secret
SESSION_SECRET=your_complex_random_string

REDIS_URL=redis://localhost:6379
```

### 3. Run Development Server

This command runs both the Vite Frontend and the Express Backend concurrently.

```bash
pnpm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000

## 🏗️ Architecture

The project is a Monorepo-style structure where Frontend and Backend live together but are served separately.

```
wlmaz/
├── public/             # Static assets (GeoJSON, Logos)
├── src/
│   ├── components/     # Vue Components (MonumentMap, UploadModal)
│   ├── pages/          # Views (Home, About)
│   ├── stores/         # Pinia State (Auth)
│   ├── auth/           # Passport.js & OAuth Logic
│   ├── routes/         # Express API Routes
│   ├── types/          # Shared TypeScript Interfaces
│   ├── index.ts        # Backend Entry Point
│   └── main.ts         # Frontend Entry Point
└── vite.config.ts      # Vite Configuration
```