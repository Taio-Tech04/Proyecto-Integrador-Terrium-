FROM node:26-alpine
WORKDIR /app/service
COPY users/package*.json ./
RUN npm ci --only=production
COPY users/ .
COPY shared/ /app/shared/
EXPOSE 3005
CMD ["node", "src/index.js"]

