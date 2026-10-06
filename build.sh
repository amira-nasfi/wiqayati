#!/usr/bin/env bash
set -o errexit

pip install --upgrade pip
pip install -r backend/requirements/base.txt

python backend/manage.py collectstatic --no-input
python backend/manage.py migrate
