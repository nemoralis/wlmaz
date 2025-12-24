# Stage 1: Build
FROM node:22-alpine AS builder

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy dependency definitions
COPY package.json pnpm-lock.yaml ./

# Install dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application (Generates 'dist' folder)
RUN pnpm run build

# Stage 2: Runtime
FROM node:22-alpine

WORKDIR /app

# Install tsx globally for running the backend
RUN npm install -g tsx

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy manifest
COPY package.json pnpm-lock.yaml tsconfig.json ./

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# Copy built frontend assets
COPY --from=builder /app/dist ./dist

# Copy backend source code
COPY src ./src

# Copy public folder (for any runtime static assets not in bundle, though Vite copies them to dist)
COPY public ./public

# Set Environment Variables
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["tsx", "src/index.ts"]
