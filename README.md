# 🚀 DeployForge

A containerized backend infrastructure project demonstrating DevOps practices using Docker, MongoDB, Nginx and AWS.

## 🛠️ Tech Stack
- Node.js & Express
- MongoDB & Mongoose
- Docker & Docker Compose
- Nginx
- GitHub Actions
- AWS EC2

## ✨ Features
- Multi-stage Docker build
- Multi-container orchestration
- Isolated Docker networking
- Persistent MongoDB storage
- Nginx reverse proxy
- Container health checks
- REST API with CRUD operations
- Automated API integration tests

## 🏗️ Architecture

```text
Client → Nginx → Node.js Backend → MongoDB
                       |
                 Docker Network
                       |
                Persistent Volume
```

## ⚙️ Run Locally

```bash
git clone https://github.com/Anujkumar9081/DeployForge.git
cd DeployForge
cp .env.example .env
```

Configure a strong MongoDB password in `.env` and update `MONGODB_URI` with the same credentials.

Start the services:

```bash
docker compose up -d --build
```

Check API health:

```bash
curl http://localhost/health
```

Run integration tests:

```bash
bash ./tests/api-test.sh http://localhost
```

## 🧪 Testing

**10/10 local integration tests passed.**

## ☁️ Deployment

AWS EC2 deployment using Ubuntu, Docker Engine and Docker Compose.

