#!/bin/bash

# Define the flask app location
export FLASK_APP=server

python3 check_db.py > /dev/null 2>&1
DB_STATUS=$?

# Check if the db is ready
if [ $DB_STATUS -eq 1 ]; then
    echo "Database is ready. Starting application..."

    # Check if the migrations directory exists, if not, initialize it
    if [ ! -d "migrations" ] || [ -z "$(ls -A migrations)" ]; then
        flask db init
    fi

    # Apply database migrations
    flask db migrate -m "Automatic migration"
    flask db upgrade

    # Prepare the application
    flask shell <<EOF
from server import create_app, seed_database
app = create_app()
seed_database(app)
EOF

    # Start Gunicorn
    exec gunicorn -b 127.0.0.1:5001 "server:create_app()"
else
    echo "Database is not ready. Waiting 10 seconds..."
    sleep 10
    exec "$0"
fi