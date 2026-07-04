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

echo "Which app shell would you like to start?"
echo "1) Web"
echo "2) Server"
echo "3) Quit"

read -r -p "Enter choice (1-3): " choice

case "$choice" in
  1)
    export FLASK_APP="web:create_app"
    export PYTHONPATH="$inner_jams_path"
    echo "Starting Flask shell for WEB..."
    flask shell
    ;;
  2)
    export FLASK_APP="server:create_app"
    export PYTHONPATH="$inner_jams_path"
    echo "Starting Flask shell for SERVER..."
    flask shell
    ;;
  3)
    echo "Cancelled."
    ;;
  *)
    echo "Invalid choice."
    ;;
esac