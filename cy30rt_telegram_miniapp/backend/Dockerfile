FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including Node.js for Reconix
RUN apt-get update && apt-get install -y \
    curl \
    git \
    wget \
    python3-pip \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20.x (required for Reconix)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Install Reconix globally
RUN npm install -g @aquibk/reconix

# Install Go for additional tools
RUN wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz && \
    tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz && \
    rm go1.21.5.linux-amd64.tar.gz
ENV PATH=$PATH:/usr/local/go/bin
ENV GOPATH=/go
ENV PATH=$PATH:$GOPATH/bin

# Install additional Go tools for bug bounty
RUN go install -v github.com/OWASP/Amass/v4/...@master && \
    go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest && \
    go install -v github.com/tomnomnom/assetfinder@latest && \
    go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest && \
    go install -v github.com/projectdiscovery/naabu/v2/cmd/naabu@latest && \
    go install -v github.com/OJ/gobuster@latest && \
    go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest

# Install WhatWeb
RUN git clone https://github.com/urbanadventurer/WhatWeb.git /opt/whatweb && \
    cd /opt/whatweb && \
    gem install bundler && bundle install || true

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./app /app/app

ENV PYTHONPATH=/app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
