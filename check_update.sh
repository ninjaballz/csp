#!/bin/bash

# Simple installer for CloudFail auto-updater
# Just downloads and installs the simple updater

echo "Installing Simple CloudFail Auto-Updater..."

# Check if root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (use sudo)"
    exit 1
fi

# Download and install updater script
curl -s -o /usr/local/bin/simple-updater.sh https://raw.githubusercontent.com/m0rtem/CloudFail/master/simple-updater.sh
chmod +x /usr/local/bin/simple-updater.sh

# Download and install service files
curl -s -o /etc/systemd/system/simple-updater.service https://raw.githubusercontent.com/m0rtem/CloudFail/master/simple-updater.service
curl -s -o /etc/systemd/system/simple-updater.timer https://raw.githubusercontent.com/m0rtem/CloudFail/master/simple-updater.timer

# Enable and start
systemctl daemon-reload
systemctl enable simple-updater.timer
systemctl start simple-updater.timer

echo "✅ Installation complete!"
echo "Auto-updater will check every 6 hours"
echo "Check status: systemctl status simple-updater.timer"
echo "View logs: tail -f /var/log/cloudfail-update.log"
