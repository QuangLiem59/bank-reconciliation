FROM node:22-alpine

WORKDIR /usr/src/app

# Copy full workspace (including src/services src/transformers,....)
COPY . .

# Install dependencies once from root
RUN npm install

# Build only
RUN npm run build:file-processing-service

# Set the correct entry point
CMD ["node", "dist/src/apps/file-processing-service/apps/file-processing-service/src/main.js"]