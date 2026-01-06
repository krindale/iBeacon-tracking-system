# Build stage
FROM node:18-alpine AS builder

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Create public directory if it doesn't exist to avoid build errors
RUN mkdir -p public

# Build the Next.js application
RUN npm run build

# Production stage
FROM node:18-alpine

# Re-declare ARG in this stage to use it in ENV
ARG NEXT_PUBLIC_API_URL

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED 1
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["npm", "start"]
