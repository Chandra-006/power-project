# Small Python base image for the FastAPI service.
FROM python:3.12-slim

WORKDIR /app

# Install dependencies separately so Docker can reuse this layer when only
# application source files change.
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Document the API port; Compose maps it to the same host port.
EXPOSE 8000

# Listen on all container interfaces so the published port is reachable.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
