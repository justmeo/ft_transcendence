#Used by docker build and docker run commands.
FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
COPY db/ /app/db/

EXPOSE 3000

CMD ["npm", "run", "start"]
