#!/usr/bin/env bash
python manage.py makemigrations
python manage.py migrate --no-input
gunicorn core.wsgi:application
