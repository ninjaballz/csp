#!/bin/bash
# CIDR Installation Script for Haraka Mail Server
# This script sets up CIDR IP masking functionality
set -e


echo "✅ Haraka installation detected"

# Create CIDR ranges directory
echo "📁 Creating CIDR directory..."
mkdir -p /opt/haraka/cidr
chown -R haraka:haraka /opt/haraka/cidr

# Create CIDR updater script with enhanced error handling
echo "📝 Creating CIDR updater script..."
cat > /opt/haraka/update_cidr.sh <<'CIDR_EOF'
#!/bin/bash
# Update CIDR ranges from GitHub with improved error handling
set -e

CIDR_DIR="/opt/haraka/cidr"
CIDR_FILE="${CIDR_DIR}/ranges.txt"
TEMP_FILE="${CIDR_DIR}/ranges.tmp"
LOG_FILE="${CIDR_DIR}/update.log"

# Create directory if it doesn't exist
mkdir -p "${CIDR_DIR}"

# Log function
log_msg() {
    echo "$(date): $1" | tee -a "${LOG_FILE}"
}

log_msg "Starting CIDR update process"

# Download CIDR ranges with timeout and retry
if curl -fsSL --max-time 30 --retry 3 --retry-delay 5 \
    "https://raw.githubusercontent.com/ninjaballz/csp/main/cidr.txt" \
    -o "${TEMP_FILE}" 2>>"${LOG_FILE}"; then
    
    log_msg "CIDR file downloaded successfully"
    
    # Verify file is not empty and contains valid data
    if [ -s "${TEMP_FILE}" ] && grep -q "^[0-9]" "${TEMP_FILE}"; then
        mv "${TEMP_FILE}" "${CIDR_FILE}"
        chmod 644 "${CIDR_FILE}"
        chown haraka:haraka "${CIDR_FILE}"
        log_msg "CIDR ranges updated successfully ($(wc -l < "${CIDR_FILE}") entries)"
        echo "✅ CIDR ranges updated: $(wc -l < "${CIDR_FILE}") entries"
    else
        log_msg "ERROR: Downloaded CIDR file is empty or invalid"
        rm -f "${TEMP_FILE}"
        echo "❌ Downloaded CIDR file is empty or invalid"
        exit 1
    fi
else
    log_msg "ERROR: Failed to download CIDR ranges from GitHub"
    rm -f "${TEMP_FILE}"
    echo "❌ Failed to download CIDR ranges from GitHub"
    exit 1
fi

log_msg "CIDR update process completed"
CIDR_EOF

# Make script executable
chmod +x /opt/haraka/update_cidr.sh
chown haraka:haraka /opt/haraka/update_cidr.sh

echo "✅ CIDR updater script created"

# Test CIDR script execution
echo "🧪 Testing CIDR script..."
if /opt/haraka/update_cidr.sh; then
    echo "✅ CIDR script test successful"
else
    echo "❌ CIDR script test failed"
    exit 1
fi

# Install cron if needed
echo "📅 Setting up cron job..."
if ! command -v crontab &> /dev/null; then
    echo "Installing cron..."
    apt-get update -qq
    apt-get install -y cron
fi

# Create cron entry for haraka user (every 10 minutes)
echo "*/10 * * * * /opt/haraka/update_cidr.sh >/dev/null 2>&1" | crontab -u haraka -

# Verify cron entry
echo "📋 Verifying cron entry..."
if crontab -u haraka -l | grep -q "update_cidr.sh"; then
    echo "✅ Cron job created successfully"
else
    echo "❌ Failed to create cron job"
    exit 1
fi

# Ensure cron service is running
systemctl enable cron
systemctl start cron
