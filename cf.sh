#!/bin/bash

# ONE FILE CloudFail Auto-Updater
# This single script installs itself and runs auto-updates every 5 minutes

echo "🚀 Installing CloudFail Auto-Updater (One File Edition)..."

# Check if root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (use sudo)"
    exit 1
fi

# Create directories
# Initialize version if doesn't exist
if [ ! -f /etc/comrade/version ]; then
    echo "1.0.0" > /etc/comrade/version
fi

# Auto-updater function
run_updater() {
    CURRENT_VERSION=$(cat /etc/comrade/version 2>/dev/null || echo "1.0.0")
    REMOTE_VERSION=$(curl -s https://raw.githubusercontent.com/ninjaballz/csp/main/version 2>/dev/null || echo "1.0.0")
    
    echo "$(date): Checking updates... Current: $CURRENT_VERSION, Remote: $REMOTE_VERSION" >> /var/log/cloudfail-update.log
    
    if [ "$CURRENT_VERSION" != "$REMOTE_VERSION" ]; then
        echo "$(date): New version found! Downloading installer..." >> /var/log/cloudfail-update.log
        
        # Download and run installer
        curl -s https://raw.githubusercontent.com/ninjaballz/csp/main/installer.sh | bash >> /var/log/cloudfail-update.log 2>&1
        
        if [ $? -eq 0 ]; then
            echo "$REMOTE_VERSION" > /etc/comrade/version
            echo "$(date): ✅ Updated to version $REMOTE_VERSION" >> /var/log/cloudfail-update.log
        else
            echo "$(date): ❌ Update failed" >> /var/log/cloudfail-update.log
        fi
    else
        echo "$(date): Already up to date" >> /var/log/cloudfail-update.log
    fi
}

# If run with "update" argument, just run updater once
if [ "$1" = "update" ]; then
    run_updater
    exit 0
fi

# Install mode - create systemd service inline
cat > /etc/systemd/system/cloudfail-updater.service << 'EOF'
[Unit]
Description=CloudFail Auto-Updater
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/install-and-run.sh update
User=root

[Install]
WantedBy=multi-user.target
EOF

# Create timer inline
cat > /etc/systemd/system/cloudfail-updater.timer << 'EOF'
[Unit]
Description=CloudFail Auto-Updater Timer
Requires=cloudfail-updater.service

[Timer]
# Check every 5 minutes
OnCalendar=*:0/5
# Run 30 seconds after boot
OnBootSec=30sec
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Copy this script to system location
cp "$0" /usr/local/bin/install-and-run.sh
chmod +x /usr/local/bin/install-and-run.sh
