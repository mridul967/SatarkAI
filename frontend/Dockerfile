FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Run Vite dev server, allowing outside connections
CMD ["npm", "run", "dev", "--", "--host"]
