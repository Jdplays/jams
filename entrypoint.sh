#!/bin/bash

# Navigate to the Flask application directory
cd app

# Apply database migrations
flask db migrate -m "Initial migration"
flask db upgrade

# Start Gunicorn
exec gunicorn -b 0.0.0.0:5000 "app:create_app()"