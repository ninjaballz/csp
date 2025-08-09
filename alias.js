const { faker } = require('@faker-js/faker');
const { fakerJA } = require('@faker-js/faker/locale/ja');
const { Buffer } = require('buffer');

exports.register = function () {
    this.loginfo("🔄 Plugin rip - Fixed version");
};

exports.hook_mail = function (next, connection, params) {
    try {
        const txn = connection.transaction;
        if (!txn) {
            connection.logerror(this, '❌ No transaction in hook_mail');
            return next();
        }

        const mailFrom = params[0];
        const domain = mailFrom.host;

        // Generate random local with equal distribution
        const local = generateRandomLocal();

        const newEmail = `${local}@${domain}`;
        txn.notes.random_from = newEmail;

        connection.loginfo(this, `📤 MAIL FROM changed to: ${newEmail}`);

        txn.mail_from.user = local;
        txn.mail_from.host = domain;

        next();
    } catch (err) {
        connection.logerror(this, `❌ hook_mail exception: ${err}`);
        next();
    }
};

function generateRandomLocal() {
    const strategy = Math.random();
    
    // 33.33% - Service-based variations
    if (strategy < 0.333) {
        const services = ['noreply', 'info', 'support', 'billing', 'account', 
                         'service', 'team', 'member', 'notification', 'alert',
                         'help', 'contact', 'news', 'update', 'system',
                         'admin', 'staff', 'desk', 'center', 'prime'];
        
        const service = faker.helpers.arrayElement(services);
        const num = faker.number.int({ min: 1, max: 99999 });
        const separators = ['', '.', '-', '_'];
        const separator = faker.helpers.arrayElement(separators);
        
        // Multiple patterns for variety - FIXED: Execute functions immediately
        const patterns = [
            service,
            `${service}${num}`,
            `${service}${separator}${num}`,
            `${service}${separator}${faker.date.month({ abbr: true }).toLowerCase()}`,
            `${service}${faker.date.birthdate().getFullYear()}`,
            `${service}${separator}jp`,
        ];
        
        return faker.helpers.arrayElement(patterns);
    }
    
    // 33.33% - Japanese names (romanized)
    if (strategy < 0.666) {
        const firstName = fakerJA.person.firstName().toLowerCase()
            .replace(/[^a-z0-9]/g, '');
        const lastName = fakerJA.person.lastName().toLowerCase()
            .replace(/[^a-z0-9]/g, '');
        const num = faker.number.int({ min: 1, max: 9999 });
        const year = faker.date.birthdate().getFullYear();
        
        // FIXED: These are now strings, not functions
        const patterns = [
            `${firstName}${lastName}`,
            `${lastName}${firstName}`,
            `${firstName}.${lastName}`,
            `${lastName}.${firstName}`,
            `${firstName}_${lastName}`,
            `${firstName}${num}`,
            `${lastName}${num}`,
            `${firstName}${lastName}${num}`,
            `${firstName}${lastName}_${num}`,
            `${firstName[0]}${lastName}`,
            `${lastName}${firstName[0]}`,
            `${firstName}${year}`,
            `${lastName}${year}`,
            `${firstName[0]}${lastName}${num}`,
            `${firstName}.${lastName[0]}`,
        ];
        
        return faker.helpers.arrayElement(patterns);
    }
    
    // 33.34% - English names
    const firstName = faker.person.firstName().toLowerCase()
        .replace(/[^a-z]/g, '');
    const lastName = faker.person.lastName().toLowerCase()
        .replace(/[^a-z]/g, '');
    const num = faker.number.int({ min: 1, max: 9999 });
    const year = faker.date.birthdate().getFullYear();
    
    // FIXED: These are now strings, not functions
    const patterns = [
        `${firstName}${lastName}`,
        `${firstName}.${lastName}`,
        `${lastName}.${firstName}`,
        `${firstName}_${lastName}`,
        `${firstName}${num}`,
        `${lastName}${num}`,
        `${firstName}${lastName}${num}`,
        `${firstName}${lastName}_${num}`,
        `${firstName[0]}${lastName}`,
        `${lastName}${firstName[0]}`,
        `${firstName}${year}`,
        `${firstName[0]}${lastName}${num}`,
        `${firstName}.${lastName[0]}`,
        `${firstName}${lastName[0]}${num}`,
    ];
    
    return faker.helpers.arrayElement(patterns);
}

exports.hook_data_post = function (next, connection) {
    const txn = connection.transaction;
    if (!txn || !txn.notes.random_from) {
        connection.logerror(this, '❌ No transaction or random_from note');
        return next();
    }

    // Get original From header
    let originalFrom = txn.header.get_decoded('From') || '';
    let displayName = '';

    // Extract display name from original header
    const nameMatch = originalFrom.match(/^(.*?)(?=\s*<)/);
    if (nameMatch) {
        displayName = nameMatch[1].trim().replace(/^"|"$/g, '');
    }

    // KEEP ORIGINAL DISPLAY NAME - only use fallback if corrupted
    if (!displayName || /�/.test(displayName)) {
        displayName = "Service";
    }

    // Encode if needed (for Japanese characters)
    const needsEncoding = /[^\x00-\x7F]/.test(displayName);
    if (needsEncoding) {
        const encoded = Buffer.from(displayName, 'utf8').toString('base64');
        displayName = `=?UTF-8?B?${encoded}?=`;
    } else if (displayName.includes(' ')) {
        displayName = `"${displayName}"`;
    }

    // Set new From with ORIGINAL display name + RANDOM email
    const fromHeader = `${displayName} <${txn.notes.random_from}>`;

    connection.loginfo(this, `📧 From: ${fromHeader}`);
    txn.remove_header('From');
    txn.add_header('From', fromHeader);
    
    // Reply-To uses just the email (no display name)
    txn.remove_header('Reply-To');
    txn.add_header('Reply-To', txn.notes.random_from);

    next();
};
