# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build frontend and compile backend
# Note: 'pnpm run build' does frontend build. We rely on 'tsx' for backend or we should compile it.
# The previous pnpm build command was: "pnpm run convert-data && vue-tsc -b && vite build"
# This builds the frontend to ./dist
RUN pnpm run build

# Current backend is run with tsx. For production we might want to compile it or just run with tsx.
# Given tsx is in devDeps but needed for start, let's keep it simple and use tsx in production or
# ideally compile it. But 'tsx' is fine for this scale if we install deps properly.
# Actually, for production best practice, let's compile the backend too if possible, 
# or just run it with tsx. Since tsx is a dev dependency, we need to ensure it's available.
# Let's adjust to just use tsx for now as it's easier than setting up tsc for backend separate from vue-tsc.

# Production Stage
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install prod dependencies
RUN pnpm install --prod --frozen-lockfile

# We need tsx for running the server if we don't compile it. 
# Since it's a devDep, we might need to install it globally or just include it.
# Safer option: Install tsx globally or locally as prod dep.
RUN pnpm add tsx

# Copy built frontend assets
COPY --from=builder /app/dist ./dist
# Copy backend source
COPY --from=builder /app/src ./src
COPY --from=builder /app/index.html ./
COPY --from=builder /app/public ./public
# Copy config files
COPY --from=builder /app/vite.config.ts ./
COPY --from=builder /app/tsconfig.json ./

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Start server
CMD ["pnpm", "exec", "tsx", "src/index.ts"]
