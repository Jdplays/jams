#!/bin/bash

# Apply database migrations
flask db init  # Initialize migrations directory (only once)
flask db migrate -m "Initial migration"
flask db upgrade

# Start Gunicorn
exec gunicorn -b 0.0.0.0:5000 "app:create_app()"