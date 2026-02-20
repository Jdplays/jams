# Use the official Python image from the Docker Hub
FROM python:3.12-slim

# Set the working directory
WORKDIR /jams

# App Code
COPY jams/server ./server
COPY jams/common ./common
COPY jams/default_config ./default_config

# Shared files
COPY jams/common/config/ ./config
COPY requirements.txt .
COPY LICENSE .
COPY jams/VERSION .

# Entrypoint and DB check
COPY jams/infra/docker/server/entrypoint.sh ./entrypoint.sh
COPY jams/infra/check_db.py ./check_db.py

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Make entrypoint.sh executable
RUN chmod +x entrypoint.sh

# Make check_db.py executable
RUN chmod +x check_db.py

# Make port 5000 available to the world outside this container
EXPOSE 5001

# Run flask app with gunicorn
CMD ["bash", "entrypoint.sh"]