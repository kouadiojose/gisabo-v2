#!/bin/bash
# Seed the database on first deploy only
# Uses psql to import database_export.sql if tables don't exist yet

if [ -z "$DATABASE_URL" ]; then
  echo "[SEED] DATABASE_URL not set, skipping seed"
  exit 0
fi

# Check if the categories table exists and has data
TABLE_CHECK=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM categories;" 2>/dev/null | tr -d ' ')

if [ "$TABLE_CHECK" != "" ] && [ "$TABLE_CHECK" -gt 0 ] 2>/dev/null; then
  echo "[SEED] Database already has data ($TABLE_CHECK categories found), skipping import"
else
  echo "[SEED] Database is empty or tables don't exist, importing database_export.sql..."
  psql "$DATABASE_URL" -f database_export.sql
  if [ $? -eq 0 ]; then
    echo "[SEED] Database import completed successfully!"
  else
    echo "[SEED] Import failed, falling back to db:push for schema only..."
    npm run db:push
  fi
fi
