#!/bin/sh
# Backup script for NeoPort
# Usage: ./scripts/backup.sh

# Configuration
BACKUP_DIR="./backups"
DB_FILE=${DATABASE_PATH:-"./portfolio.db"} # Default to dev path if env not set
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_PATH="${BACKUP_DIR}/portfolio_backup_${TIMESTAMP}.db"

# Ensure backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo "Creating backup directory..."
    mkdir -p "$BACKUP_DIR"
fi

# Check if database exists
if [ ! -f "$DB_FILE" ]; then
    echo "❌ Error: Database file not found at $DB_FILE"
    exit 1
fi

# Perform backup
echo "📦 Backing up database..."
cp "$DB_FILE" "$BACKUP_PATH"

# Verify backup
if [ -f "$BACKUP_PATH" ]; then
    echo "✅ Backup successful: $BACKUP_PATH"
else
    echo "❌ Backup failed!"
    exit 1
fi
