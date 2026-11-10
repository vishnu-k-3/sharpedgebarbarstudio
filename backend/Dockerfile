# OPTIONAL backend — run with:  docker compose up -d
FROM node:20-alpine
WORKDIR /app
COPY server.js .
RUN mkdir -p /app/data
VOLUME ["/app/data"]
EXPOSE 3000
CMD ["node", "server.js"]
