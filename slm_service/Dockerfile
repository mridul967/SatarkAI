FROM python:3.11-slim

# Install system deps for PyTorch + bitsandbytes
RUN apt-get update && apt-get install -y \
    gcc g++ git curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy service code
COPY . .

# Expose port
EXPOSE 8765

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:8765/health || exit 1

# Start the service
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8765", "--workers", "1"]
