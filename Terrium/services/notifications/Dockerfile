FROM node:26-alpine
WORKDIR /app/service
COPY notifications/package*.json ./
RUN npm ci --only=production
COPY notifications/ .
COPY shared/ /app/shared/
EXPOSE 3004
CMD ["node", "src/index.js"]

