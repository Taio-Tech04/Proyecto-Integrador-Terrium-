FROM node:26-alpine
WORKDIR /app/service
COPY analytics/package*.json ./
RUN npm ci --only=production
COPY analytics/ .
EXPOSE 3003
CMD ["node", "src/index.js"]

