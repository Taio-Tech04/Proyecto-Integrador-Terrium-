FROM nginx:1.25-alpine

# Eliminar config default
RUN rm /etc/nginx/conf.d/default.conf

# Copiar config personalizada
COPY nginx.conf /etc/nginx/conf.d/terrium.conf

# Copiar archivos estáticos del frontend
COPY . /usr/share/nginx/html

# Eliminar archivos que no son del frontend
RUN rm -f /usr/share/nginx/html/Dockerfile /usr/share/nginx/html/nginx.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/nginx-health || exit 1

CMD ["nginx", "-g", "daemon off;"]

