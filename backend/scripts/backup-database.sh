#!/bin/bash
# Database backup script for SQLite database (Linux/Mac version)
# Creates a backup of the SQLite database with timestamp
# Supports compression and automatic cleanup of old backups
#
# Usage:
#   ./backup-database.sh [database_path] [backup_dir] [keep_days]
#
# Examples:
#   ./backup-database.sh
#   ./backup-database.sh ./production.db ./backups 90

# Set default values
DATABASE_PATH="${1:-dev.db}"
BACKUP_DIR="${2:-backups}"
KEEP_DAYS="${3:-30}"
COMPRESS=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}=== Database Backup Script ===${NC}"
echo ""

# Check if database file exists
if [ ! -f "$DATABASE_PATH" ]; then
    echo -e "${RED}❌ Database file not found: $DATABASE_PATH${NC}"
    exit 1
fi

echo -e "${GREEN}📁 Database: $DATABASE_PATH${NC}"

# Create backup directory if it doesn't exist
if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    echo -e "${GREEN}📂 Created backup directory: $BACKUP_DIR${NC}"
fi

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="backup_${TIMESTAMP}.db"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILENAME"

# Copy database file
echo -e "${YELLOW}🔄 Creating backup...${NC}"
cp "$DATABASE_PATH" "$BACKUP_PATH"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Backup failed${NC}"
    exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
echo -e "${GREEN}✅ Backup created: $BACKUP_PATH ($BACKUP_SIZE)${NC}"

# Compress if requested
if [ "$COMPRESS" = true ]; then
    echo -e "${YELLOW}🗜️  Compressing backup...${NC}"
    COMPRESSED_PATH="$BACKUP_PATH.gz"
    gzip "$BACKUP_PATH"
    
    COMPRESSED_SIZE=$(du -h "$COMPRESSED_PATH" | cut -f1)
    echo -e "${GREEN}✅ Compressed: $COMPRESSED_PATH ($COMPRESSED_SIZE)${NC}"
fi

# Cleanup old backups
echo -e "${YELLOW}🧹 Cleaning up old backups (older than $KEEP_DAYS days)...${NC}"
REMOVED_COUNT=0

# Find and remove old backups
find "$BACKUP_DIR" -name "backup_*.db*" -type f -mtime +$KEEP_DAYS | while read -r OLD_BACKUP; do
    rm "$OLD_BACKUP"
    echo -e "  🗑️  Removed: $(basename "$OLD_BACKUP")"
    REMOVED_COUNT=$((REMOVED_COUNT + 1))
done

if [ $REMOVED_COUNT -eq 0 ]; then
    echo -e "  ${GREEN}✅ No old backups to remove${NC}"
else
    echo -e "  ${GREEN}✅ Removed $REMOVED_COUNT old backup(s)${NC}"
fi

# Show backup summary
echo ""
echo -e "${CYAN}=== Backup Summary ===${NC}"
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "backup_*.db*" -type f | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo -e "Total backups: $BACKUP_COUNT"
echo -e "Total size: $TOTAL_SIZE"
echo -e "Backup directory: $(cd "$BACKUP_DIR" && pwd)"

echo ""
echo -e "${GREEN}✅ Backup completed successfully!${NC}"
exit 0
