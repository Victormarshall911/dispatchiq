FROM node:24-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build backend + frontend
COPY . .
RUN npm run build

# Expose port and start the server
EXPOSE 3000
CMD ["npm", "start"]
