#!/bin/sh
set -eu

ROOT="${STORAGE_ASSETS_ROOT:-/workspace}"
SUPABASE_URL="${SUPABASE_URL:-http://supabase-kong:8000}"
SUPABASE_URL="${SUPABASE_URL%/}"

if [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "SUPABASE_SERVICE_ROLE_KEY is missing"
  exit 1
fi

upload_object() {
  bucket="$1"
  object_name="$2"
  file_path="$3"
  content_type="$4"

  if [ ! -f "$file_path" ]; then
    echo "skip missing $file_path"
    return 0
  fi

  echo "upload $bucket/$object_name"
  curl --fail --silent --show-error --request POST \
    --url "$SUPABASE_URL/storage/v1/object/$bucket/$object_name" \
    --header "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    --header "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    --header "Content-Type: $content_type" \
    --header "x-upsert: true" \
    --data-binary "@$file_path" >/dev/null
}

upload_object "images" "universitate.jpg" "$ROOT/assets/universitate.jpg" "image/jpeg"
upload_object "images" "uggal.jpg" "$ROOT/Frontend/Dashboard/dashboard-insideugal/public/uggal.jpg" "image/jpeg"
upload_object "images" "campus-stiintei.png" "$ROOT/Frontend/Mobile/assets/images/campus-stiintei.png" "image/png"
upload_object "images" "placeholders/1920x1080.png" "$ROOT/Frontend/Mobile/assets/images/placeholders/1920x1080.png" "image/png"
upload_object "images" "placeholders/500x500.png" "$ROOT/Frontend/Mobile/assets/images/placeholders/500x500.png" "image/png"

upload_object "faculty-logos" "ugal-logo.png" "$ROOT/Frontend/Dashboard/dashboard-insideugal/public/logo_alb.png" "image/png"
upload_object "faculty-logos" "mobile-logo.png" "$ROOT/Frontend/Mobile/assets/images/logo.png" "image/png"

upload_object "documents" "Regulament_Camine_UGAL.pdf" "$ROOT/LLM/src/modul-marius/pdfs/Regulament_Camine_UGAL.pdf" "application/pdf"
echo "storage assets seeded"
