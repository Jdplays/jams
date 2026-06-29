#!/usr/bin/env bash
set -u

original_location="$(pwd)"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd "$script_dir/.." && pwd)"
inner_jams_path="$project_root/jams"

cd "$inner_jams_path" || exit 1

cleanup() {
  cd "$original_location" || true
}
trap cleanup EXIT

export FLASK_APP="server:create_app"
export PYTHONPATH="$inner_jams_path"
export FLASK_ENV="development"

echo "=== JAMS Server DB Migration ==="
echo "1) flask db init         - Initialise migrations folder (run once)"
echo "2) flask db migrate      - Generate migration script"
echo "3) flask db upgrade      - Apply latest migration to DB"
echo "4) flask db downgrade    - Rollback last migration"
echo "5) flask db current      - Show current migration"
echo "6) quit"

read -r -p "Enter choice (1-6): " choice

case "$choice" in
  1) flask db init ;;
  2) flask db migrate ;;
  3) flask db upgrade ;;
  4) flask db downgrade ;;
  5) flask db current ;;
  6) echo "Cancelled." ;;
  *) echo "Invalid choice." ;;
esac