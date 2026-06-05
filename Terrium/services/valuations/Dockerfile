FROM node:26-alpine
WORKDIR /app/service
COPY valuations/package*.json ./
RUN npm ci --only=production
COPY valuations/ .
COPY shared/ /app/shared/
EXPOSE 3002
CMD ["node", "src/index.js"]

