# Build Stage
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps
RUN npm install ajv@^8 --legacy-peer-deps

COPY . .

ARG REACT_APP_BACKEND_URL=http://localhost:8008
ARG REACT_APP_BYPASS_AUTH=true

ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
ENV REACT_APP_BYPASS_AUTH=$REACT_APP_BYPASS_AUTH

RUN npm run build

# Production Stage with Nginx
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
