# Use Node.js base image
FROM node:20

# Set working directory
WORKDIR /app

# Copy package files and install deps
COPY package*.json ./
RUN npm install

# Copy rest of the app
COPY . .

# App listens on this port (App Runner reads this)
ENV PORT=8080
EXPOSE 8080

# Start the server
CMD ["node", "socket-server-deploy.js"]
