# Containerized Backend Infrastructure with Docker, MongoDB, and Nginx

A production-ready, containerized backend infrastructure demonstrating real-world DevOps practices, multi-stage Docker builds, isolated network segmentation, service orchestration, reverse proxy configuration, and persistent storage.

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Architecture Explanation](#2-architecture-explanation)
3. [Technologies Used](#3-technologies-used)
4. [Project Directory Structure](#4-project-directory-structure)
5. [Prerequisites](#5-prerequisites)
6. [Environment Variable Configuration](#6-environment-variable-configuration)
7. [How to Build Docker Images](#7-how-to-build-docker-images)
8. [How to Start Services Using Docker Compose](#8-how-to-start-services-using-docker-compose)
9. [How to Stop and Restart Services](#9-how-to-stop-and-restart-services)
10. [How to Inspect Containers, Images, Networks, and Volumes](#10-how-to-inspect-containers-images-networks-and-volumes)
11. [How to View Application and Nginx Logs](#11-how-to-view-application-and-nginx-logs)
12. [How to Test Every API Endpoint Using cURL](#12-how-to-test-every-api-endpoint-using-curl)
13. [How to Verify MongoDB Data Persistence](#13-how-to-verify-mongodb-data-persistence)
14. [Common Errors and Troubleshooting Steps](#14-common-errors-and-troubleshooting-steps)
15. [Instructions for Deploying on Ubuntu EC2](#15-instructions-for-deploying-on-ubuntu-ec2)

---

## 1. Project Overview

This project serves as a practical, production-oriented DevOps showcase. It implements a decoupled three-tier microservice architecture:
- **Nginx (Reverse Proxy & Ingress)**: Handles external incoming HTTP requests on port `80`, terminates client connections, enforces security headers, buffers requests, and proxies traffic to the private application layer.
- **Node.js / Express REST API (Backend)**: Runs an asynchronous, stateless task-management REST API with input validation, graceful shutdown hooks, and health-checking routines. It runs under an unprivileged `node` user inside a minimal multi-stage Alpine container.
- **MongoDB (Database)**: Provides isolated document storage with authentication enabled, health-checked with `mongosh`, and mounted onto a named Docker volume for data persistence across container recycles.

---

## 2. Architecture Explanation

### Communication & Network Topology

All inter-service communication takes place across an internal, software-defined Docker bridge network (`devops-app-network`). No backend application port or database port is directly published to the host machine or public internet.

```
 Internet / Host Machine
           │
           │ HTTP (Port 80)
           ▼
┌────────────────────────────────────────────────────────┐
│  devops-nginx (Nginx 1.27 Alpine)                     │
│  - Public Port: 80:80                                 │
│  - Upstream: http://backend:5000                      │
│  - Ingress Reverse Proxy, Proxy Headers, Timeouts      │
└──────────────────────────┬─────────────────────────────┘
                           │
                           │ Docker Bridge Network: `devops-app-network`
                           │ (Internal DNS Resolution)
                           ▼
┌────────────────────────────────────────────────────────┐
│  devops-backend (Node.js 20 Alpine)                   │
│  - Private Internal Port: 5000 (No host publish)      │
│  - Non-root user: node (UID 1000)                      │
│  - REST API & Health Check (/health, /api/tasks)      │
└──────────────────────────┬─────────────────────────────┘
                           │
                           │ Docker Bridge Network: `devops-app-network`
                           │ mongodb://admin:secret@mongodb:27017/tasks_db
                           ▼
┌────────────────────────────────────────────────────────┐
│  devops-mongodb (MongoDB 7.0)                         │
│  - Private Internal Port: 27017 (No host publish)     │
│  - Authentication Enabled                             │
│  - Healthcheck: mongosh ping                          │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │ Named Volume:           │
              │ devops-mongodb-data     │
              │ Mounted at /data/db     │
              └─────────────────────────┘
```

### Key DevOps Design Decisions:
1. **Network Segmentation**: Only Nginx publishes port `80` to the host. The backend and MongoDB containers are completely inaccessible from the outside world, drastically reducing the attack surface.
2. **Docker Internal DNS**: Services communicate using service hostnames (`http://backend:5000` and `mongodb:27017`). Docker's embedded DNS server (`127.0.0.11`) automatically resolves these names to container IP addresses.
3. **Health-Check Orchestration**: Docker Compose uses `condition: service_healthy` so that the backend only starts once MongoDB's ping probe succeeds, and Nginx only routes traffic once the backend health check passes.
4. **Principle of Least Privilege**: The backend container switches from `root` to the built-in `node` user in the final Docker image stage.
5. **Data Persistence**: The named Docker volume `devops-mongodb-data` stores the `/data/db` directory outside the ephemeral container lifecycle, guaranteeing zero data loss when containers are destroyed or updated.

---

## 3. Technologies Used

- **Node.js 20 (LTS) & Express.js 4**: Asynchronous JavaScript runtime and web framework.
- **Mongoose 8**: Object Data Modeling (ODM) library for MongoDB validation and query building.
- **MongoDB 7.0**: Document-oriented NoSQL database.
- **Nginx 1.27 (Alpine)**: High-performance HTTP server, reverse proxy, and ingress controller.
- **Docker & Docker Compose (v2/v5)**: Multi-stage containerization and multi-container orchestration.
- **Helmet & Morgan**: HTTP security header hardening and structured access logging.

---

## 4. Project Directory Structure

```
project/
├── .dockerignore              # Excludes unnecessary build context (node_modules, .env, git)
├── .env.example               # Template for required environment variables
├── .gitignore                 # Prevents secrets and build artifacts from entering VCS
├── compose.yaml               # Multi-service container orchestration declaration
├── Dockerfile                 # Production multi-stage build definition for Node.js backend
├── package.json               # Backend dependencies, metadata, and scripts
├── README.md                  # Complete architectural, operational, and deployment manual
├── nginx/
│   └── nginx.conf             # Production Nginx reverse proxy configuration & upstream rules
├── src/
│   ├── app.js                 # Express application configuration and middleware stack
│   ├── server.js              # Server bootstrapper, MongoDB connector & graceful shutdown
│   ├── config/
│   │   └── db.js              # Mongoose connection manager with retry logic and events
│   ├── controllers/
│   │   ├── healthController.js# GET /health probe returning uptime and DB state
│   │   └── taskController.js  # CRUD controllers for /api/tasks with validation
│   ├── middleware/
│   │   ├── errorHandler.js    # Centralized error handler and 404 route catcher
│   │   └── requestLogger.js   # Morgan HTTP access logger with timestamps
│   ├── models/
│   │   └── Task.js            # Mongoose schema and indexes for tasks collection
│   └── utils/
│       └── logger.js          # Standardized console logger utility
└── tests/
    └── api-test.sh            # Automated bash integration test suite using cURL
```

---

## 5. Prerequisites

Before running the project locally or on a server, ensure you have:
- **Docker Engine** (version 24.0+ recommended)
- **Docker Compose** (version 2.20+ / Docker Compose plugin)
- **cURL** and **bash** (for running API queries and automated test scripts)
- (Optional for local development outside Docker) **Node.js 20+** and **npm 10+**

Verify your Docker installation:
```bash
docker --version
docker compose version
```

---

## 6. Environment Variable Configuration

Create a local `.env` file by copying `.env.example`:

```bash
cp .env.example .env
```

Review or modify `.env` as needed:

| Variable | Description | Default in `.env.example` |
|---|---|---|
| `NODE_ENV` | Application environment mode | `production` |
| `PORT` | Internal backend port (inside container) | `5000` |
| `HOST` | Binding address inside container | `0.0.0.0` |
| `MONGO_INITDB_ROOT_USERNAME` | Initial root user for MongoDB | `admin` |
| `MONGO_INITDB_ROOT_PASSWORD` | Initial root password for MongoDB | `supersecretpassword` |
| `MONGO_INITDB_DATABASE` | Initial database name | `tasks_db` |
| `MONGODB_URI` | Full connection URI used by backend | `mongodb://admin:supersecretpassword@mongodb:27017/tasks_db?authSource=admin` |
| `NGINX_PORT` | Host port mapped to Nginx reverse proxy | `80` |

> **Security Warning:** Never commit `.env` into version control. Ensure it is listed in `.gitignore`.

---

## 7. How to Build Docker Images

### Building with Docker Compose (Recommended)
Docker Compose will build the backend using `Dockerfile` according to specifications in `compose.yaml`:

```bash
docker compose build
```

To build without using cache (for clean production builds):
```bash
docker compose build --no-cache
```

### Building the Backend Dockerfile Directly
You can also build and inspect the standalone multi-stage backend image:

```bash
docker build -t devops-backend:1.0.0 -f Dockerfile .
```

Verify that the image size is lightweight:
```bash
docker images devops-backend:1.0.0
```

---

## 8. How to Start Services Using Docker Compose

### Start Services in the Background (Detached Mode)
```bash
docker compose up -d --build
```

### Watch the Startup Progression
Watch all three services initialize, execute health checks, and transition to healthy:

```bash
docker compose ps
```

You should see:
- `devops-mongodb`: `Up (healthy)`
- `devops-backend`: `Up (healthy)`
- `devops-nginx`: `Up (healthy)`

---

## 9. How to Stop and Restart Services

### Stop Containers Without Deleting Data
```bash
docker compose stop
```

### Restart All Services
```bash
docker compose restart
```

### Restart a Specific Service (e.g., Nginx after config change)
```bash
docker compose restart nginx
```

### Tear Down Containers and Networks (Preserving Data Volume)
```bash
docker compose down
```

### Tear Down Everything (Including Volumes - Destructive!)
```bash
docker compose down -v
```

---

## 10. How to Inspect Containers, Images, Networks, and Volumes

### Inspect Running Containers
```bash
# List containers with status, health and port bindings
docker compose ps

# Detailed low-level container inspect
docker inspect devops-backend
```

### Inspect Networks
```bash
# List Docker networks
docker network ls

# Inspect the isolated bridge network and connected containers
docker network inspect devops-app-network
```

### Inspect Volumes
```bash
# List Docker volumes
docker volume ls

# Inspect the persistent MongoDB volume
docker volume inspect devops-mongodb-data
```

### Inspect Resource Usage (CPU & Memory)
```bash
docker stats --no-stream
```

---

## 11. How to View Application and Nginx Logs

### View Aggregated Live Logs
```bash
docker compose logs -f
```

### View Backend Logs Only
```bash
docker compose logs -f backend
```

### View Nginx Access & Error Logs
```bash
docker compose logs -f nginx
```

### View MongoDB Logs
```bash
docker compose logs -f mongodb
```

### View the Last 100 Log Lines with Timestamps
```bash
docker compose logs --tail=100 -t backend
```

---

## 12. How to Test Every API Endpoint Using cURL

All requests are sent to port `80` (or `http://localhost`), passing through Nginx to the backend.

### Automated Test Suite
Run the automated test suite that executes all CRUD tests and validations:
```bash
./tests/api-test.sh http://localhost
```

---

### Manual cURL Commands

#### 1. Root Information Endpoint
```bash
curl -i http://localhost/
```

#### 2. Health Check Endpoint
```bash
curl -i http://localhost/health
```
**Expected Response (`200 OK`):**
```json
{
  "status": "healthy",
  "uptime": 24.12,
  "uptimeHuman": "0h 0m 24s",
  "timestamp": "2026-11-10T18:40:00.000Z",
  "environment": "production",
  "services": {
    "api": "operational",
    "database": "connected"
  }
}
```

#### 3. Create a Task (POST)
```bash
curl -i -X POST http://localhost/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Set up production monitoring",
    "description": "Configure Prometheus and Grafana dashboards",
    "status": "in-progress",
    "priority": "high",
    "dueDate": "2026-12-01T00:00:00.000Z"
  }'
```
**Expected Response (`201 Created`):** Returns the created task with its MongoDB `id`.

#### 4. List All Tasks (GET)
```bash
curl -i http://localhost/api/tasks
```
**With Query Filters (status & priority):**
```bash
curl -i "http://localhost/api/tasks?status=in-progress&priority=high"
```

#### 5. Get a Specific Task by ID (GET)
Replace `<TASK_ID>` with the actual ID returned from the POST request:
```bash
curl -i http://localhost/api/tasks/<TASK_ID>
```

#### 6. Update a Task (PUT)
```bash
curl -i -X PUT http://localhost/api/tasks/<TASK_ID> \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "priority": "medium"
  }'
```

#### 7. Delete a Task (DELETE)
```bash
curl -i -X DELETE http://localhost/api/tasks/<TASK_ID>
```

#### 8. Test Validation Error (POST with empty title)
```bash
curl -i -X POST http://localhost/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"description": "Missing title test"}'
```
**Expected Response (`400 Bad Request`):**
```json
{
  "success": false,
  "error": "Validation Error",
  "message": "Task title is required and cannot be empty."
}
```

#### 9. Test Malformed ID (GET with invalid ObjectId)
```bash
curl -i http://localhost/api/tasks/not-a-valid-id
```
**Expected Response (`400 Bad Request`):**
```json
{
  "success": false,
  "error": "Invalid ID format",
  "message": "The provided ID 'not-a-valid-id' is not a valid MongoDB ObjectId."
}
```

---

## 13. How to Verify MongoDB Data Persistence

A key requirement in production infrastructure is verifying that database data survives container recycles and host reboots.

### Step-by-Step Persistence Verification:

1. **Insert a test task via the API:**
   ```bash
   curl -s -X POST http://localhost/api/tasks \
     -H "Content-Type: application/json" \
     -d '{"title": "Persistent Data Check Task"}'
   ```

2. **Verify the task exists:**
   ```bash
   curl -s http://localhost/api/tasks
   ```

3. **Completely tear down the running containers:**
   ```bash
   docker compose down
   ```
   *(Notice that we do NOT use `-v`. The named volume `devops-mongodb-data` remains intact on the host).*

4. **Verify containers are stopped and removed:**
   ```bash
   docker compose ps
   ```

5. **Start the containers back up:**
   ```bash
   docker compose up -d
   ```

6. **Query the API again:**
   ```bash
   curl -s http://localhost/api/tasks
   ```
   **Result:** The task `"Persistent Data Check Task"` is still returned! This proves that data persists inside the `devops-mongodb-data` volume across complete container destruction.

---

## 14. Common Errors and Troubleshooting Steps

### 1. `502 Bad Gateway` from Nginx
- **Cause**: Nginx is running, but the backend container is either starting up, crashed, or unreachable on `http://backend:5000`.
- **Diagnosis**:
  ```bash
  docker compose ps
  docker compose logs backend
  ```
- **Fix**: Check `backend` logs for unhandled errors or missing database connections. Confirm both containers are attached to `devops-app-network`.

### 2. Backend Fails to Connect to MongoDB (`ECONNREFUSED` or `MongoServerSelectionError`)
- **Cause**:
  - The backend tried to connect before MongoDB was initialized and accepting traffic.
  - The hostname in `MONGODB_URI` was set to `localhost` instead of the Docker service name `mongodb`.
  - The MongoDB credentials do not match between `.env` and Compose.
- **Diagnosis**:
  ```bash
  docker compose logs mongodb
  ```
- **Fix**: Verify `compose.yaml` has `depends_on: mongodb: condition: service_healthy`. Check that `MONGODB_URI` contains `@mongodb:27017` and matches `MONGO_INITDB_ROOT_USERNAME` and `MONGO_INITDB_ROOT_PASSWORD`.

### 3. Port 80 Already in Use on Host (`bind: address already in use`)
- **Cause**: Apache, system Nginx, or another web server is already bound to port 80 on the host machine.
- **Diagnosis**:
  ```bash
  sudo lsof -i :80  # macOS / Linux
  sudo ss -tulpn | grep :80
  ```
- **Fix**: Change the mapped host port in `.env` without modifying the containers:
  ```env
  NGINX_PORT=8080
  ```
  Then access the application at `http://localhost:8080`.

### 4. Container Exits Immediately (`status: Exited (1)`)
- **Diagnosis**:
  ```bash
  docker compose logs <service-name>
  ```
- **Fix**:
  - For Node.js: verify file paths and package dependencies.
  - Check file permissions: ensure files copied in Dockerfile are readable by user `node`.

---

## 15. Instructions for Deploying on Ubuntu EC2

Follow these production deployment instructions to launch and run this project on an AWS EC2 Ubuntu instance:

### Step 1: Launch and Configure the EC2 Instance
1. Launch an EC2 instance:
   - **AMI**: Ubuntu 22.04 LTS or Ubuntu 24.04 LTS (64-bit x86 or ARM64).
   - **Instance Type**: `t3.small` or `t2.small` (recommended for production database and builds; `t2.micro` works if swap space is configured).
   - **Storage**: At least 20 GB gp3 SSD.
2. Configure **Security Group** Inbound Rules:
   - **SSH**: Port `22` (restrict to your IP).
   - **HTTP**: Port `80` (Source: `0.0.0.0/0`).
   - **HTTPS**: Port `443` (Source: `0.0.0.0/0`, for future SSL).
   - **DO NOT** open ports `5000` or `27017` publicly.

### Step 2: Connect to the EC2 Instance
```bash
ssh -i /path/to/your-key.pem ubuntu@<EC2-PUBLIC-IP>
```

### Step 3: Install Docker Engine and Docker Compose Plugin
Run the official Docker installation commands on Ubuntu:
```bash
# Update package indices
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine and Compose plugin
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Enable and start Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Add ubuntu user to docker group (avoids needing sudo for docker commands)
sudo usermod -aG docker ubuntu
```
> Log out and log back in for group membership to take effect:
> ```bash
> exit
> ssh -i /path/to/your-key.pem ubuntu@<EC2-PUBLIC-IP>
> ```

### Step 4: Clone Your Project Repository
```bash
git clone <YOUR_GITHUB_REPOSITORY_URL> devops-project
cd devops-project
```

### Step 5: Configure Environment Variables
```bash
cp .env.example .env
nano .env
```
Generate strong production passwords for MongoDB and save the file.

### Step 6: Build and Launch Services
```bash
docker compose up -d --build
```

### Step 7: Verify Service Health
```bash
docker compose ps
docker compose logs -f
```

### Step 8: Test Public Access
From your local computer terminal or web browser:
```bash
# Test Health Endpoint
curl http://<EC2-PUBLIC-IP>/health

# Run test script against EC2
./tests/api-test.sh http://<EC2-PUBLIC-IP>
```
You now have a fully operational, containerized, reverse-proxied production backend running on AWS EC2!

