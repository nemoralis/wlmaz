![WLMAZ Project Banner](./public/wlm-az.png)

# Wiki Loves Monuments Azerbaijan - Interactive Map

![GitHub License](https://img.shields.io/github/license/nemoralis/wlmaz)
![Contributors](https://img.shields.io/github/contributors/nemoralis/wlmaz?color=dark-green) ![Stargazers](https://img.shields.io/github/stars/nemoralis/wlmaz?style=social)
![Issues](https://img.shields.io/github/issues/nemoralis/wlmaz)

**wlmaz** is a full-stack mapping application designed to help contributors discover heritage monuments in Azerbaijan and upload photos directly to Wikimedia Commons. 

It features a responsive, clustered map interface powered by Vue 3 and Leaflet, backed by a secure Node.js proxy that handles MediaWiki OAuth authentication and uploads.

## Features

- **Interactive Map:** High-performance markers and clustering powered by `Leaflet.markercluster` with canvas rendering.
- **Fuzzy Search:** Fast, client-side search across thousands of monuments with fuzzy matching capabilities.
- **MediaWiki OAuth:** Secure authentication using existing Wikimedia accounts.
- **Direct Uploads:** Seamless photo uploads to Wikimedia Commons directly from the interface.
- **Deep Linking:** Share specific monuments via unique inventory URLs (e.g., `?inventory=4810`).
- **Rich Metadata:** Automatic image credits, Wikidata integration, and Schema.org structured data.
- **Mobile Optimized:** Fully responsive sidebar and map controls designed for field use.
- **Persistence:** Redis-backed session management for stable authentication in production.

## Getting Started

### Prerequisites

- **Node.js:** v20.6.0 or higher.
- **npm:** Use npm for package management.
- **Redis:** Required for session management in production.

### 1. Clone & Install

```bash
git clone https://github.com/nemoralis/wlmaz.git
cd wlmaz
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```bash
WM_CONSUMER_KEY=
WM_CONSUMER_SECRET=

NODE_ENV=
PORT=3000
CLIENT_URL=http://localhost:5173
SESSION_SECRET=SessionSecret
REDIS_URL=redis://:redispassword@localhost:6379
```

### 3. Start Redis (Docker)

If you don't have Redis installed locally, you can start it using Docker:

```bash
docker run -d --name wlmaz-redis -p 6379:6379 redis:alpine
```

### 4. Run Development Server

This command runs both the Vite Frontend and the Express Backend concurrently.

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000


## License

This project is licensed under the MIT License.
