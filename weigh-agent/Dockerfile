# syntax=docker/dockerfile:1
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install runtime tools for healthcheck and printing (optional)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY weigh_agent_optimized.py ./
COPY config.json ./

# Create runtime dirs
RUN mkdir -p logs buffer

EXPOSE 8787

# Default env (can be overridden by compose)
ENV WA_HEALTH_PORT=8787

CMD ["python", "weigh_agent_optimized.py"]

