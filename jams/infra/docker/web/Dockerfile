# Use the official Python image from the Docker Hub
FROM python:3.12-slim

# Install curl to get Node.js and npm
RUN apt-get update && apt-get install -y curl

# Install Node.js and npm
RUN curl -fsSl https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Set the working directory
WORKDIR /jams

# App Code
COPY jams/web ./web
COPY jams/common ./common
COPY jams/default_config ./default_config

# Shared files
COPY config ./config
COPY requirements.txt .
COPY LICENSE .
COPY VERSION .

# Entrypoint and DB check
COPY jams/infra/docker/web/entrypoint.sh ./entrypoint.sh
COPY jams/infra/check_db.py ./check_db.py

# Copy required files for typescript
COPY package.json .
COPY jams/infra/docker/web/tsconfig-prod.json ./tsconfig.json
COPY jams/infra/docker/web/webpack-prod.config.mjs ./webpack.config.mjs

# Install node packages
RUN npm i

# Bundle the typescript into javascript
RUN npm run build

# Remove the typescript files
RUN rm -rf ./web/static/ts

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Make entrypoint.sh executable
RUN chmod +x entrypoint.sh

# Make check_db.py executable
RUN chmod +x check_db.py

# Make port 5000 available to the world outside this container
EXPOSE 5000

# Run flask app with gunicorn
CMD ["bash", "entrypoint.sh"]