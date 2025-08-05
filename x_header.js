exports.hook_data_post = function (next, connection) {
    const txn = connection.transaction;
    if (!txn) return next();

    const from = txn.mail_from.address();  // e.g., john@abc123.example.com

    if (!from || !from.includes('@')) {
        return next();  // Invalid or missing sender
    }

    const domainFull = from.split('@')[1];  // e.g., abc123.example.com
    const domainParts = domainFull.split('.');

    // Extract subdomain (fallback to 'mail' if not present)
    const subdo = domainParts.length > 2 ? domainParts[0] : 'mail';

    // Extract domain root (e.g., example.com)
    const domain = domainParts.slice(-2).join('.');

    // Generate unsubscribe token
    const token = Math.random().toString(36).substring(2, 16);  // 14-character token

    // Construct headers
    const unsubscribe_url = `https://${subdo}.${domain}/lu/${token}`;
    const errors_to = `bounce-${token}@${subdo}.${domain}`;

    txn.add_header('X-Priority', '3');
    txn.add_header('Errors-To', errors_to);
    txn.add_header('List-Unsubscribe', `<${unsubscribe_url}>`);
    txn.add_header('List-Unsubscribe-Post', 'List-Unsubscribe=One-Click');

    return next();
};
