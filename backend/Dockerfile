# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json ./

# Generate Prisma Client
RUN npx prisma generate

# In this setup, we're using tsx to run directly in dev/local-production
# If we wanted a lean production build, we would compile to JS.
# For now, let's stick to the current workflow.

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Install tsx globally or rely on node_modules
RUN npm install -g tsx

EXPOSE 4000

# Script to run migrations and then start the server
CMD npx prisma migrate deploy && tsx src/index.ts
