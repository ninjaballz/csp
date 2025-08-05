const { faker } = require('@faker-js/faker');

exports.register = function () {
    this.loginfo("🔥 Plugin rip loaded and ready.");
};

exports.hook_mail = function (next, connection, params) {
    try {
        const txn = connection.transaction;
        if (!txn) {
            connection.logerror(this, '❌ No transaction in hook_mail');
            return next();
        }

        const mailFrom = params[0]; // Address object

        const first = faker.person.firstName().toLowerCase();
        const last = faker.person.lastName().toLowerCase();
        const randomId = Math.floor(100 + Math.random() * 900);

        const local = Math.random() > 0.5
            ? `${first}_${last}${randomId}`
            : `${first}${last}_${randomId}`;
        const domain = mailFrom.host;

        const newEmail = `${local}@${domain}`;
        txn.notes.random_from = newEmail;

        connection.loginfo(this, `📤 MAIL FROM changed to: ${newEmail}`);

        // override the actual mail_from
        txn.mail_from.user = local;
        txn.mail_from.host = domain;

        next();
    } catch (err) {
        connection.logerror(this, `❌ hook_mail exception: ${err}`);
        next();
    }
};

exports.hook_data_post = function (next, connection) {
    const txn = connection.transaction;
    if (!txn || !txn.notes.random_from) {
        connection.logerror(this, '❌ No transaction or random_from note in hook_data_post.');
        return next();
    }

    // Try to extract the display name from the original From header
    const originalFrom = txn.header.get_decoded('From') || '';
    const nameMatch = originalFrom.match(/^(.*?)</);
    const displayName = nameMatch ? nameMatch[1].trim().replace(/^"|"$/g, '') : '';

    const fromHeader = displayName
        ? `"${displayName}" <${txn.notes.random_from}>`
        : `<${txn.notes.random_from}>`;

    connection.loginfo(this, `📧 Setting From header to: ${fromHeader}`);
    txn.remove_header('From');
    txn.add_header('From', fromHeader);

    next();
};
