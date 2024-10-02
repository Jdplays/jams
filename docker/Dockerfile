# Use the official Python image from the Docker Hub
FROM python:3.12-slim

# Install curl to get Node.js and npm
RUN apt-get update && apt-get install -y curl

# Install Node.js and npm
RUN curl -fsSl https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Set the working directory
WORKDIR /jams

# Copy the current directory contents into the container at /jams
COPY /jams ./jams

# Copy the entrypoint.sh file into the container
COPY ./entrypoint.sh .

# Copy the entrypoint.sh file into the container
COPY ./requirements.txt .

# Copy the check_db.py file into the container
COPY ./check_db.py .

# Copy the user config folder into the container
COPY ./config .

# Copy required files for typescript
COPY ./package.json .
COPY ./tsconfig.json .
COPY ./docker/webpack-prod.config.mjs ./webpack.config.mjs

# Copy the licence into the container
COPY ./LICENSE .

# Install node packages
RUN npm i

# Bundle the typescript into javascript
RUN npm run build

# Remove the typescript files
RUN rm -rf ./jams/static/ts

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