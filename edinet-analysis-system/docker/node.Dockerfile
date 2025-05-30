# Base Dockerfile for Node.js services
FROM node:18-alpine

# Install dependencies for building native modules
RUN apk add --no-cache python3 make g++

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app source
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Expose port (will be overridden in service-specific Dockerfile)
EXPOSE 3000

# Start the application
CMD ["node", "src/index.js"]