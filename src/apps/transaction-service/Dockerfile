FROM node:22-alpine

WORKDIR /usr/src/app

# Copy full workspace (including src/services src/transformers,....)
COPY . .

# Install dependencies once from root
RUN npm install

# Build only
RUN npm run build:transaction-service

# Set the correct entry point
CMD ["node", "dist/src/apps/transaction-service/apps/transaction-service/src/main.js"]