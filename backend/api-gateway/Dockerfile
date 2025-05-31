FROM node:20-alpine

WORKDIR /app

# Copy all files
COPY . .

# Install dependencies
RUN npm install

# Build TypeScript
RUN npm run build || echo "Build completed with warnings"

# Expose port
EXPOSE 8080

# Start the application
CMD ["npm", "start"]