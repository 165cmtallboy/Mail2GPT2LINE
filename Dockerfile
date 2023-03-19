from node:16-alpine

copy package.json .
copy dist .
copy .env .
RUN npm install
RUN ls

CMD ["node", "main.js"]