#!/bin/bash

python3 check_db.py
DB_STATUS=$?

# Check if the db is ready
if [$DB_STATUS -eq 1]; then
    echo "Databse is ready. Starting application..."

    # Check if the migrations directory exists, if not, initialize it
    if [ ! -d "migrations" ] || [ -z "$(ls -A migrations)" ]; then
        flask db init
    fi

    # Apply database migrations
    flask db migrate -m "Automatic migration"
    flask db upgrade

    # Seed the database
    flask shell <<EOF
from app import create_app, seed_database
app = create_app()
seed_database(app)
EOF

    # Start Gunicorn
    exec gunicorn -b 0.0.0.0:5000 "app:create_app()"
else
    echo "Database is not ready. Waiting 10 seconds..."
    sleep 10
    exec "$0"
fi