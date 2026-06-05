FROM node:26-alpine
WORKDIR /app/service
COPY listings/package*.json ./
RUN npm ci --only=production
COPY listings/ .
COPY shared/ /app/shared/
EXPOSE 3001
CMD ["node", "src/index.js"]

