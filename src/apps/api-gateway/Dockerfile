FROM node:22-alpine

WORKDIR /usr/src/app

# Copy full workspace (including src/services src/transformers,....)
COPY . .

# Install dependencies once from root
RUN npm install

# Build only
RUN npm run build:api-gateway

# Set the correct entry point
CMD ["node", "dist/src/apps/api-gateway/apps/api-gateway/src/main.js"]