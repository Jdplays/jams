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

    export PYTHONUNBUFFERED=1
    echo "Starting WebSocket Server..."
    nohup python -m websocket_server > /var/log/wss.log 2>&1 &

    sleep 3

    echo "Starting JAMS Web App..."
    exec gunicorn -k gevent -w 2 -b 0.0.0.0:5000 "jams:create_app()"
    
    # ✅ Start Supervisor instead of Gunicorn directly
    #echo "Starting Supervisor..."
    #exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
else
    echo "Database is not ready. Waiting 10 seconds..."
    sleep 10
    exec "$0"
fi