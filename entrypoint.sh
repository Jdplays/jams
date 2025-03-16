#!/bin/bash

# Define the flask app location
export FLASK_APP=jams

python3 check_db.py > /dev/null 2>&1
DB_STATUS=$?

# Check if the db is ready
if [ $DB_STATUS -eq 1 ]; then
    echo "Databse is ready. Starting application..."

    # Check if the migrations directory exists, if not, initialize it
    if [ ! -d "migrations" ] || [ -z "$(ls -A migrations)" ]; then
        flask db init
    fi

    # Apply database migrations
    flask db migrate -m "Automatic migration"
    flask db upgrade

    # Prepare the application
    flask shell <<EOF
from jams import create_app, seed_database
app = create_app()
seed_database(app)
EOF
    exec python -m websocket_server
    sleep 3
    exec gunicorn -k gevent -w 2 -b 0.0.0.0:5000 "jams:create_app()"
    
    # ✅ Start Supervisor instead of Gunicorn directly
    #echo "Starting Supervisor..."
    #exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
else
    echo "Database is not ready. Waiting 10 seconds..."
    sleep 10
    exec "$0"
fi