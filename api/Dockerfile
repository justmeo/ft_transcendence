FROM node:20-alpine

# Install runtime + build dependencies (build deps removed after npm install)
RUN apk add --no-cache curl python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --only=production \
    && apk del python3 make g++

# Copy source code
COPY src/ ./src/

# Create database directory
RUN mkdir -p ./db

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership and switch to non-root user
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 8080

CMD ["npm", "start"]
