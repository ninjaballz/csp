#!/bin/bash
# CIDR Installation Script for Haraka Mail Server
# This script sets up CIDR IP masking functionality
set -e

echo "🔧 Starting CIDR Installation..."

# Check if Haraka is installed and running
if ! systemctl is-active --quiet haraka; then
    echo "❌ Haraka service is not running. Please install mail server first."
    exit 1
fi

if [ ! -d "/opt/haraka" ]; then
    echo "❌ Haraka directory not found. Please install mail server first."
    exit 1
fi

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

# Download and install custom connection.js with CIDR support
echo "🔄 Installing CIDR-enabled connection.js..."
if curl -fsSL "https://raw.githubusercontent.com/ninjaballz/csp/refs/heads/main/connect.js" -o /tmp/connection.js; then
    if [ -f /usr/lib/node_modules/Haraka/connection.js ]; then
        # Backup original if not already backed up
        if [ ! -f /usr/lib/node_modules/Haraka/connection.js.backup ]; then
            cp /usr/lib/node_modules/Haraka/connection.js /usr/lib/node_modules/Haraka/connection.js.backup
        fi
        
        # Install CIDR-enabled version
        cp /tmp/connection.js /usr/lib/node_modules/Haraka/connection.js
        chmod 644 /usr/lib/node_modules/Haraka/connection.js
        rm -f /tmp/connection.js
        echo "✅ CIDR-enabled connection.js installed"
    else
        echo "❌ Haraka connection.js not found at expected location"
        exit 1
    fi
else
    echo "❌ Failed to download CIDR-enabled connection.js"
    exit 1
fi

# Restart Haraka service to apply changes
echo "🔄 Restarting Haraka service..."
systemctl restart haraka

# Wait a moment and verify service is running
sleep 3
if systemctl is-active --quiet haraka; then
    echo "✅ Haraka service restarted successfully"
else
    echo "❌ Haraka service failed to restart"
    systemctl status haraka
    exit 1
fi

# Show CIDR status
echo ""
echo "🎉 CIDR Installation Complete!"
echo "📊 CIDR Status:"
echo "   - CIDR directory: /opt/haraka/cidr"
echo "   - Update script: /opt/haraka/update_cidr.sh"
echo "   - Cron job: Every 10 minutes"
echo "   - Log file: /opt/haraka/cidr/update.log"

# Show current CIDR ranges count
if [ -f /opt/haraka/cidr/ranges.txt ]; then
    RANGE_COUNT=$(wc -l < /opt/haraka/cidr/ranges.txt)
    echo "   - Current ranges: ${RANGE_COUNT} entries"
else
    echo "   - Current ranges: Not yet downloaded"
fi

echo ""
echo "📝 To view CIDR logs: cat /opt/haraka/cidr/update.log"
echo "🔧 To manually update: /opt/haraka/update_cidr.sh"
echo "📋 To view cron jobs: crontab -u haraka -l"
