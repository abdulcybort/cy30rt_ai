FROM python:3.11-slim

WORKDIR /app

# Install only essential system dependencies (NO Go, NO extra tools)
RUN apt-get update && apt-get install -y \
    curl \
    git \
    python3-pip \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20.x for Reconix
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Install ONLY Reconix (no other Go tools)
RUN npm install -g @aquibk/reconix

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ./app /app/app

ENV PYTHONPATH=/app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
