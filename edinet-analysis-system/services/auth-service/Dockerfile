FROM node:20-alpine

WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build || echo "No build script"

# Expose port
EXPOSE 3001

# Start the service
CMD ["node", "dist/index.js"]