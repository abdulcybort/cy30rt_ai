FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including Node.js for Reconix
RUN apt-get update && apt-get install -y \
    nodejs \
    npm \
    curl \
    git \
    wget \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20+ (if needed)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# Install Reconix globally
RUN npm install -g @aquibk/reconix

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./app /app/app

ENV PYTHONPATH=/app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
