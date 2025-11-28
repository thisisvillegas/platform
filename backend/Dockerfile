# Use official Node.js runtime as base image
FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy TypeScript config and source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript to JavaScript
RUN npm install typescript @types/node @types/express @types/cors --save-dev && \
    npm run build && \
    npm uninstall typescript @types/node @types/express @types/cors

# Remove source files after build (we only need the compiled JS)
RUN rm -rf src tsconfig.json

# Expose the port the app runs on
EXPOSE 3000

# Set Node environment to production
ENV NODE_ENV=production

# Start the application
CMD ["node", "dist/server.js"]