# ---- Builder Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first for better layer caching
COPY package*.json ./

RUN npm ci

# Copy TypeScript config and source code
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript to JavaScript
RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine

WORKDIR /app

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Copy production dependencies and package manifest
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Create required directories
RUN mkdir -p uploads logs

EXPOSE 3000

CMD ["node", "dist/index.js"]
