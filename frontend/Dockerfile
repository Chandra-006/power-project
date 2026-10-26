# Build the static Vite application in a Node stage.
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
# Use the lockfile for a repeatable dependency installation.
RUN npm ci

COPY . .

# Vite embeds this value into the generated JavaScript at build time.
ARG VITE_API_BASE_URL=http://localhost:8000
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# Serve only the compiled static files from a lightweight Nginx image.
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# Keep Nginx in the foreground so it remains the container's main process.
CMD ["nginx", "-g", "daemon off;"]
