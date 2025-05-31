FROM node:20-alpine

WORKDIR /usr/src/app

# Install system dependencies for PDF generation and building
RUN apk add --no-cache chromium chromium-chromedriver python3 make g++ cairo-dev pango-dev

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy all files
COPY . .

# Install all dependencies
RUN npm install --legacy-peer-deps

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3004

# Start the service
CMD ["npm", "start"]