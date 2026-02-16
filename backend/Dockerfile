# Use official Node.js LTS image as base
FROM node:20-alpine

# Set working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first
COPY package*.json ./

# Install dependencies as root
RUN npm install --production

# Create a non-root user and switch to it
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy the rest of the backend code
COPY . .

# Change ownership of the app directory to the non-root user
RUN chown -R appuser:appgroup /usr/src/app

# Switch to non-root user
USER appuser

# Expose the port your server listens on
EXPOSE 5000

# Start the server
CMD ["node", "server.js"]
