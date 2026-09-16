FROM node:20-slim

WORKDIR /app

COPY package.json ./
RUN npm install --legacy-peer-deps

# O código será espelhado via volume, e expomos a porta para a rede
CMD ["npm", "run", "dev", "--", "--host"]