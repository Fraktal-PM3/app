FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build the app
RUN npm run build

# Expose port
EXPOSE 4000

# Start in development mode when volumes are mounted, production mode otherwise
CMD ["npm", "run", "dev"]
