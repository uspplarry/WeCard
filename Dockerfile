# Stage 1: Build React frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npx vite build

# Stage 2: Build Go backend
FROM golang:1.22-alpine AS backend-builder
WORKDIR /app
ENV GOPROXY=https://goproxy.io,https://goproxy.cn,direct
COPY go.mod ./
COPY main.go ./
RUN go mod tidy
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o wecard .

# Stage 3: Build extremely lightweight runtime container
FROM alpine:3.19
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app

# Copy Go binary
COPY --from=backend-builder /app/wecard .

# Copy Built React app assets to dist/ (which the Go binary serves)
COPY --from=frontend-builder /app/dist ./dist

# Create standard persistent volume paths
RUN mkdir -p /app/data /app/uploads

EXPOSE 3000

ENV PORT=3000

CMD ["./wecard"]
