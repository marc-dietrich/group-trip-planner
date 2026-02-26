# Build frontend assets
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Build arguments for Vite env values
ARG VITE_API_BASE_URL
ARG VITE_OAUTH_BASE_URL
ARG VITE_STRIPE_BASE_URL
# Use CUSTOM_DOMAIN=true to keep Vite base at "/" in container
ARG CUSTOM_DOMAIN=true

ENV CUSTOM_DOMAIN=${CUSTOM_DOMAIN}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_OAUTH_BASE_URL=${VITE_OAUTH_BASE_URL}
ENV VITE_STRIPE_BASE_URL=${VITE_STRIPE_BASE_URL}
ENV NODE_ENV=production

RUN npm run build

# Serve static files
FROM nginx:1.27-alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
