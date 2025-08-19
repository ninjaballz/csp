#!/bin/bash
#Update alias.js replacing faker ja which is not working

curl -fsSL -o /opt/haraka/plugins/alias.js https://raw.githubusercontent.com/ninjaballz/csp/refs/heads/main/alias.js

echo "1.2.1" > /etc/comrade/version
