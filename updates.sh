#!/bin/bash

echo "🔄 Updating Haraka plugins..."

curl -fsSL -o /opt/haraka/plugins/alias.js https://raw.githubusercontent.com/ninjaballz/csp/refs/heads/main/alias.js
curl -fsSL -o /opt/haraka/plugins/x_header.js https://raw.githubusercontent.com/ninjaballz/csp/refs/heads/main/x_header.js
curl -fsSL -o /opt/haraka/plugins/optimize.js https://raw.githubusercontent.com/ninjaballz/csp/refs/heads/main/optimize.js
echo "optimize" >> /opt/haraka/config/plugins

echo "✅ Plugins updated successfully."

# Optionally restart Haraka
systemctl restart haraka

wget https://raw.githubusercontent.com/ninjaballz/csp/refs/heads/main/get_update && bash get_update --once
