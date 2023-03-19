from node:16-alpine

copy package.json .
copy dist .
copy .env .