# Use the official Python image from the Docker Hub
FROM python:3.9-slim

# Set the working directory
WORKDIR /jams

# Copy the current directory contents into the container at /app
COPY /app ./app

# Copy the entrypoint.sh file into the container
COPY ./entrypoint.sh .

# Copy the entrypoint.sh file into the container
COPY ./requirements.txt .

# Copy the check_db.py file into the container
COPY ./check_db.py .

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