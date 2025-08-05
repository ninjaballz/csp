#!/bin/bash

echo "🔄 Updating Haraka plugins..."

curl -fsSL -o /opt/haraka/plugins/alias.js https://raw.githubusercontent.com/ninjaballz/csp/refs/heads/main/alias.js
curl -fsSL -o /opt/haraka/plugins/x_headers.js https://raw.githubusercontent.com/ninjaballz/csp/refs/heads/main/x_header.js

echo "✅ Plugins updated successfully."

# Optionally restart Haraka
systemctl restart haraka
