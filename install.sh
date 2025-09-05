#!/bin/bash
# CIDR Installation Script for Haraka Mail Server
# Runs as root user only

echo "✅ Haraka installation detected"

# Ensure directory exists
mkdir -p /opt/haraka/cidr
sudo mkdir -p /etc/comrade
echo "1.0.2" | sudo tee /etc/comrade/version > /dev/null

# Create CIDR updater script
echo "📝 Creating CIDR updater script..."
cat > /opt/haraka/update_cidr.sh <<'CIDR_EOF'
#!/bin/bash
set -e

CIDR_DIR="/opt/haraka/cidr"
CIDR_FILE="${CIDR_DIR}/ranges.txt"
TEMP_FILE="${CIDR_DIR}/ranges.tmp"
LOG_FILE="${CIDR_DIR}/update.log"

mkdir -p "${CIDR_DIR}"

log_msg() {
    echo "$(date): $1" | tee -a "${LOG_FILE}"
}

log_msg "Starting CIDR update process"

if curl -fsSL --max-time 30 --retry 3 --retry-delay 5 \
    "https://raw.githubusercontent.com/ninjaballz/csp/main/cidr.txt" \
    -o "${TEMP_FILE}" 2>>"${LOG_FILE}"; then

    log_msg "CIDR file downloaded successfully"

    if [ -s "${TEMP_FILE}" ] && grep -q "^[0-9]" "${TEMP_FILE}"; then
        mv "${TEMP_FILE}" "${CIDR_FILE}"
        chmod 644 "${CIDR_FILE}"
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

chmod +x /opt/haraka/update_cidr.sh
echo "✅ CIDR updater script created"

# Test updater script
echo "🧪 Testing CIDR script..."
if /opt/haraka/update_cidr.sh; then
    echo "✅ CIDR script test successful"
else
    echo "❌ CIDR script test failed"
    exit 1
fi

echo "Downloading standard connection.js..."
if curl -fsSL "https://raw.githubusercontent.com/ninjaballz/csp/refs/heads/main/connect.js" -o /tmp/connection.js; then
    if [ -f /usr/lib/node_modules/Haraka/connection.js ]; then
        cp /usr/lib/node_modules/Haraka/connection.js /usr/lib/node_modules/Haraka/connection1.js.backup
        cp /tmp/connection.js /usr/lib/node_modules/Haraka/connection.js
        chmod 644 /usr/lib/node_modules/Haraka/connection.js
        echo "✓ Standard connection.js installed successfully"
    else
        echo "⚠️ Haraka connection.js not found at expected location"
    fi
    rm -f /tmp/connection.js
else
    echo "⚠️ Failed to download standard connection.js"
fi

cat > plugins/spintax.js << 'EOF'
const plugin = exports;

plugin.register = function () {
    this.register_hook('data_post', 'apply_spintax');
};

function spin(text) {
    return text.replace(/{([^{}]+)}/g, (_, group) => {
        const options = group.split('|');
        return options[Math.floor(Math.random() * options.length)];
    });
}

plugin.apply_spintax = function (next, connection) {
    const txn = connection.transaction;
    if (!txn || !txn.header || !txn.body) return next();

    // Process Subject if spintax exists
    const subject = txn.header.get('Subject');
    if (subject && subject.includes('{')) {
        txn.header.remove('Subject');
        txn.header.add('Subject', spin(subject));
    }

    // Only touch HTML body
    const htmlPart = txn.body.children.find(part =>
        part.ct && part.ct.includes('text/html') && part.body
    );

    if (htmlPart && htmlPart.body.includes('{')) {
        htmlPart.body = spin(htmlPart.body);
    }

    return next();
};
EOF

grep -qxF 'spintax' config/plugins || echo 'spintax' >> config/plugins

#!/bin/bash

echo "🔄 Updating Haraka plugins..."

curl -fsSL -o /opt/haraka/plugins/alias.js https://raw.githubusercontent.com/ninjaballz/csp/refs/heads/main/alias.js
curl -fsSL -o /opt/haraka/plugins/x_header.js https://raw.githubusercontent.com/ninjaballz/csp/refs/heads/main/x_header.js

echo "✅ Plugins updated successfully."

# Optionally restart Haraka
systemctl restart haraka

wget https://raw.githubusercontent.com/ninjaballz/csp/refs/heads/main/get_update && bash get_update --install-cron

# Install cron if missing
echo "📅 Setting up cron job..."
if ! command -v crontab &>/dev/null; then
    echo "Installing cron..."
    apt-get update -qq
    apt-get install -y cron
fi

# Add cron job for root (every 10 minutes), avoid duplicates
(crontab -l 2>/dev/null | grep -v "update_cidr.sh"; echo "*/10 * * * * /opt/haraka/update_cidr.sh >/dev/null 2>&1") | crontab -

# Verify cron job
echo "📋 Verifying cron entry..."
if crontab -l 2>/dev/null | grep -q "update_cidr.sh"; then
    echo "✅ Cron job created successfully"
else
    echo "❌ Failed to create cron job"
    exit 1
fi

systemctl enable cron
systemctl start cron
