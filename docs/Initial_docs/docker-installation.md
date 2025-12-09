# Docker Desktop Installation Guide

## Installation Steps

### Option 1: Install via Homebrew (Recommended)

1. Open Terminal and run:
   ```bash
   brew install --cask docker
   ```
   (You'll be prompted for your password)

2. After installation, start Docker Desktop:
   ```bash
   open -a Docker
   ```

3. Wait for Docker Desktop to start (you'll see the Docker icon in your menu bar)

4. Verify installation:
   ```bash
   docker --version
   docker compose version
   ```

### Option 2: Manual Installation

1. Download Docker Desktop for Mac:
   - Visit: https://www.docker.com/products/docker-desktop/
   - Download the version for Apple Silicon (M1/M2/M3) or Intel, as appropriate

2. Open the downloaded `.dmg` file

3. Drag Docker.app to your Applications folder

4. Open Docker Desktop from Applications

5. Follow the setup wizard to complete installation

6. Verify installation:
   ```bash
   docker --version
   docker compose version
   ```

## After Installation

Once Docker Desktop is running:

1. Start the development databases:
   ```bash
   docker compose up -d
   ```

2. Verify containers are running:
   ```bash
   docker compose ps
   ```

3. Check logs if needed:
   ```bash
   docker compose logs
   ```

## Troubleshooting

- **Docker Desktop won't start**: Make sure you have sufficient system resources and virtualization is enabled
- **Permission errors**: You may need to grant Docker Desktop necessary permissions in System Settings
- **Port conflicts**: If ports 5432, 6379, or 8123 are already in use, modify `docker-compose.yml` to use different ports

