FROM node:8.11.1
COPY . /app
WORKDIR /app
ENTRYPOINT node index.js