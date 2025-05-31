FROM node:20-alpine

WORKDIR /usr/src/app

# Copy all files
COPY . .

# Install all dependencies
RUN npm install

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3001

# Start the service
CMD ["npm", "start"]