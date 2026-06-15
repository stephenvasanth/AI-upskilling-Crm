FROM node:22-alpine

WORKDIR /app

# Cache dependencies in their own layer so they're only re-installed when package.json changes.
COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 4210

# --poll is needed for live reload to pick up changes through the bind-mounted volume on Windows.
CMD ["npm", "start", "--", "--host", "0.0.0.0", "--port", "4210", "--poll", "2000"]
