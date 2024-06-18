#!/bin/bash
flask db upgrade
exec gunicorn -b 0.0.0.0:5000 app:app