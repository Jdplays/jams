#!/bin/bash

# Define the flask app location
export FLASK_APP=web

python3 check_db.py > /dev/null 2>&1
DB_STATUS=$?

# Check if the db is ready
if [ $DB_STATUS -eq 1 ]; then
    echo "Database is ready. Starting application..."

    # Start Gunicorn
    exec gunicorn -k gevent -w 1 -b 0.0.0.0:5000 "web:create_app()"
else
    echo "Database is not ready. Waiting 10 seconds..."
    sleep 10
    exec "$0"
fi