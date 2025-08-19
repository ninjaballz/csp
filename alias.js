const { faker } = require('@faker-js/faker');
const { Buffer } = require('buffer');

// Helper function to clean and ensure valid email local part
function cleanEmailLocal(str) {
    if (!str || str.length === 0) return 'user';
    return str.toLowerCase()
        .replace(/[^a-z0-9._-]/g, '')
        .replace(/^[._-]+|[._-]+$/g, '') // Remove leading/trailing separators
        .substring(0, 64) || 'user'; // Ensure max length and fallback
}

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
    // Use faker for completely random strategy selection
    const strategies = [
        'person_names',
        'international_names', 
        'random_words',
        'company_related',
        'internet_usernames',
        'product_names',
        'color_animal',
        'location_based',
        'hobby_related',
        'science_tech'
    ];
    
    const strategy = faker.helpers.arrayElement(strategies);
    
    switch (strategy) {
        case 'person_names':
            return generatePersonBasedEmail();
        case 'international_names':
            return generateInternationalEmail();
        case 'random_words':
            return generateRandomWordEmail();
        case 'company_related':
            return generateCompanyEmail();
        case 'internet_usernames':
            return generateInternetEmail();
        case 'product_names':
            return generateProductEmail();
        case 'color_animal':
            return generateColorAnimalEmail();
        case 'location_based':
            return generateLocationEmail();
        case 'hobby_related':
            return generateHobbyEmail();
        case 'science_tech':
            return generateScienceTechEmail();
        default:
            return generatePersonBasedEmail();
    }
}

function generatePersonBasedEmail() {
    const firstName = cleanEmailLocal(faker.person.firstName());
    const lastName = cleanEmailLocal(faker.person.lastName());
    const middleName = cleanEmailLocal(faker.person.middleName());
    const separators = ['', '.', '-', '_'];
    const separator = faker.helpers.arrayElement(separators);
    
    const patterns = [
        `${firstName}${lastName}`,
        `${firstName}${separator}${lastName}`,
        `${lastName}${separator}${firstName}`,
        `${firstName}${faker.number.int({ min: 1, max: 9999 })}`,
        `${lastName}${faker.number.int({ min: 1, max: 9999 })}`,
        `${firstName}${lastName}${faker.number.int({ min: 1, max: 999 })}`,
        `${firstName.charAt(0)}${lastName}`,
        `${lastName}${firstName.charAt(0)}`,
        `${firstName}${faker.date.birthdate({ min: 1970, max: 2005 }).getFullYear()}`,
        `${firstName.charAt(0)}${lastName}${faker.number.int({ min: 1, max: 99 })}`,
        `${firstName}${separator}${lastName.charAt(0)}`,
        `${firstName}${lastName.charAt(0)}${faker.number.int({ min: 1, max: 999 })}`,
        `${middleName.charAt(0)}${firstName}${lastName}`,
        `${firstName}${middleName.charAt(0)}${lastName}`,
        `${firstName}${separator}${middleName}${separator}${lastName}`
    ];
    
    const result = cleanEmailLocal(faker.helpers.arrayElement(patterns));
    return result;
}

function generateInternationalEmail() {
    const firstName = cleanEmailLocal(faker.person.firstName());
    const lastName = cleanEmailLocal(faker.person.lastName());
    const separators = ['', '.', '-', '_'];
    const separator = faker.helpers.arrayElement(separators);
    
    const patterns = [
        `${firstName}${lastName}`,
        `${lastName}${firstName}`,
        `${firstName}${separator}${lastName}`,
        `${lastName}${separator}${firstName}`,
        `${firstName}${faker.number.int({ min: 1, max: 9999 })}`,
        `${lastName}${faker.number.int({ min: 1, max: 9999 })}`,
        `${firstName}${lastName}${faker.number.int({ min: 1, max: 999 })}`,
        `${firstName.charAt(0)}${lastName}`,
        `${lastName}${firstName.charAt(0)}`,
        `${firstName}${faker.date.birthdate({ min: 1980, max: 2005 }).getFullYear()}`,
        `${lastName}${faker.date.birthdate({ min: 1980, max: 2005 }).getFullYear()}`,
        `${firstName.charAt(0)}${lastName}${faker.number.int({ min: 1, max: 99 })}`,
        `${firstName}${separator}${lastName.charAt(0)}`,
        `${firstName}${lastName.charAt(0)}${faker.number.int({ min: 1, max: 999 })}`,
        `${cleanEmailLocal(faker.string.alpha({ length: 1 }))}${firstName}${lastName}`
    ];
    
    const result = cleanEmailLocal(faker.helpers.arrayElement(patterns));
    return result;
}

function generateRandomWordEmail() {
    const adjective = cleanEmailLocal(faker.word.adjective());
    const noun = cleanEmailLocal(faker.word.noun());
    const verb = cleanEmailLocal(faker.word.verb());
    const adverb = cleanEmailLocal(faker.word.adverb());
    const separators = ['', '.', '-', '_'];
    const separator = faker.helpers.arrayElement(separators);
    
    const patterns = [
        adjective,
        noun,
        verb,
        `${adjective}${noun}`,
        `${adjective}${separator}${noun}`,
        `${verb}${noun}`,
        `${adjective}${verb}`,
        `${noun}${faker.number.int({ min: 1, max: 9999 })}`,
        `${adjective}${faker.number.int({ min: 1, max: 999 })}`,
        `${adverb}${noun}`,
        `${adjective}${separator}${verb}`,
        `${noun}${separator}${adjective}`,
        `${verb}${separator}${adverb}`,
        `${adjective.charAt(0)}${noun}${faker.number.int({ min: 1, max: 99 })}`,
        `${noun}${verb.charAt(0)}${faker.number.int({ min: 1, max: 999 })}`
    ];
    
    const result = cleanEmailLocal(faker.helpers.arrayElement(patterns));
    return result;
}

function generateCompanyEmail() {
    const companyName = cleanEmailLocal(faker.company.name()).substring(0, 10);
    const buzzword = cleanEmailLocal(faker.company.buzzPhrase().split(' ')[0]);
    const department = cleanEmailLocal(faker.commerce.department());
    const separators = ['', '.', '-', '_'];
    const separator = faker.helpers.arrayElement(separators);
    
    const patterns = [
        companyName,
        buzzword,
        department,
        `${companyName}${faker.number.int({ min: 1, max: 999 })}`,
        `${buzzword}${faker.number.int({ min: 1, max: 999 })}`,
        `${department}${faker.number.int({ min: 1, max: 999 })}`,
        `${companyName}${separator}${department}`,
        `${buzzword}${separator}${companyName}`,
        `${department}${separator}${buzzword}`,
        `${companyName.charAt(0)}${department}`,
        `${buzzword}${companyName.charAt(0)}`,
        `${companyName}${faker.date.birthdate({ min: 2000, max: 2024 }).getFullYear()}`,
        `${department}${separator}${cleanEmailLocal(faker.string.alpha({ length: 2 }))}`,
        `${buzzword}${separator}${cleanEmailLocal(faker.location.countryCode())}`
    ];
    
    const result = cleanEmailLocal(faker.helpers.arrayElement(patterns));
    return result;
}

function generateInternetEmail() {
    const username = cleanEmailLocal(faker.internet.userName());
    const displayName = cleanEmailLocal(faker.internet.displayName());
    const domainWord = cleanEmailLocal(faker.internet.domainWord());
    const separators = ['', '.', '-', '_'];
    const separator = faker.helpers.arrayElement(separators);
    
    const patterns = [
        username,
        displayName,
        domainWord,
        `${username}${faker.number.int({ min: 1, max: 9999 })}`,
        `${displayName}${faker.number.int({ min: 1, max: 999 })}`,
        `${domainWord}${faker.number.int({ min: 1, max: 999 })}`,
        `${username}${separator}${displayName}`,
        `${displayName}${separator}${domainWord}`,
        `${username}${separator}${domainWord}`,
        `${username.charAt(0)}${displayName}`,
        `${displayName}${username.charAt(0)}`,
        `${domainWord}${username.charAt(0)}`,
        `${username}${faker.date.birthdate({ min: 1990, max: 2010 }).getFullYear()}`,
        `${displayName}${separator}${cleanEmailLocal(faker.string.alphanumeric({ length: 2 }))}`
    ];
    
    const result = cleanEmailLocal(faker.helpers.arrayElement(patterns));
    return result;
}

function generateProductEmail() {
    const product = cleanEmailLocal(faker.commerce.product());
    const productName = cleanEmailLocal(faker.commerce.productName().split(' ')[0]);
    const material = cleanEmailLocal(faker.commerce.productMaterial());
    const separators = ['', '.', '-', '_'];
    const separator = faker.helpers.arrayElement(separators);
    
    const patterns = [
        product,
        productName,
        material,
        `${product}${faker.number.int({ min: 1, max: 999 })}`,
        `${productName}${faker.number.int({ min: 1, max: 999 })}`,
        `${material}${faker.number.int({ min: 1, max: 999 })}`,
        `${product}${separator}${material}`,
        `${productName}${separator}${product}`,
        `${material}${separator}${productName}`,
        `${product.charAt(0)}${material}`,
        `${productName}${product.charAt(0)}`,
        `${material}${productName.charAt(0)}`,
        `${product}${faker.date.birthdate({ min: 2010, max: 2024 }).getFullYear()}`,
        `${productName}${separator}${cleanEmailLocal(faker.string.alpha({ length: 2 }))}`
    ];
    
    const result = cleanEmailLocal(faker.helpers.arrayElement(patterns));
    return result;
}

function generateColorAnimalEmail() {
    const color = cleanEmailLocal(faker.color.human());
    const animal = cleanEmailLocal(faker.animal.type());
    const bird = cleanEmailLocal(faker.animal.bird());
    const separators = ['', '.', '-', '_'];
    const separator = faker.helpers.arrayElement(separators);
    
    const patterns = [
        color,
        animal,
        bird,
        `${color}${animal}`,
        `${color}${separator}${animal}`,
        `${animal}${color}`,
        `${color}${bird}`,
        `${bird}${color}`,
        `${animal}${bird}`,
        `${color}${faker.number.int({ min: 1, max: 999 })}`,
        `${animal}${faker.number.int({ min: 1, max: 999 })}`,
        `${bird}${faker.number.int({ min: 1, max: 999 })}`,
        `${color.charAt(0)}${animal}${faker.number.int({ min: 1, max: 99 })}`,
        `${animal}${color.charAt(0)}${faker.number.int({ min: 1, max: 99 })}`
    ];
    
    const result = cleanEmailLocal(faker.helpers.arrayElement(patterns));
    return result;
}

function generateLocationEmail() {
    const city = cleanEmailLocal(faker.location.city());
    const country = cleanEmailLocal(faker.location.country());
    const state = cleanEmailLocal(faker.location.state());
    const street = cleanEmailLocal(faker.location.street());
    const separators = ['', '.', '-', '_'];
    const separator = faker.helpers.arrayElement(separators);
    
    const patterns = [
        city,
        country,
        state,
        street,
        `${city}${faker.number.int({ min: 1, max: 999 })}`,
        `${country}${faker.number.int({ min: 1, max: 999 })}`,
        `${state}${faker.number.int({ min: 1, max: 999 })}`,
        `${city}${separator}${state}`,
        `${state}${separator}${city}`,
        `${country}${separator}${city}`,
        `${city.charAt(0)}${state}`,
        `${country}${city.charAt(0)}`,
        `${street}${city.charAt(0)}`,
        `${city}${cleanEmailLocal(faker.location.countryCode())}`,
        `${state}${separator}${cleanEmailLocal(faker.string.alpha({ length: 2 }))}`
    ];
    
    const result = cleanEmailLocal(faker.helpers.arrayElement(patterns));
    return result;
}

function generateHobbyEmail() {
    const music = cleanEmailLocal(faker.music.genre());
    const vehicle = cleanEmailLocal(faker.vehicle.type());
    const food = cleanEmailLocal(faker.commerce.productName());
    const book = cleanEmailLocal(faker.commerce.productAdjective());
    const separators = ['', '.', '-', '_'];
    const separator = faker.helpers.arrayElement(separators);
    
    const patterns = [
        music,
        vehicle,
        food,
        book,
        `${music}${faker.number.int({ min: 1, max: 999 })}`,
        `${vehicle}${faker.number.int({ min: 1, max: 999 })}`,
        `${food}${faker.number.int({ min: 1, max: 999 })}`,
        `${book}${faker.number.int({ min: 1, max: 999 })}`,
        `${music}${separator}${vehicle}`,
        `${food}${separator}${music}`,
        `${book}${separator}${vehicle}`,
        `${music.charAt(0)}${food}`,
        `${vehicle}${book.charAt(0)}`,
        `${food}${music.charAt(0)}${faker.number.int({ min: 1, max: 99 })}`,
        `${book}${separator}${cleanEmailLocal(faker.string.alpha({ length: 2 }))}`
    ];
    
    const result = cleanEmailLocal(faker.helpers.arrayElement(patterns));
    return result;
}

function generateScienceTechEmail() {
    const science = cleanEmailLocal(faker.science.chemicalElement().name);
    const database = cleanEmailLocal(faker.database.column());
    const finance = cleanEmailLocal(faker.finance.accountName());
    const hacker = cleanEmailLocal(faker.hacker.noun());
    const separators = ['', '.', '-', '_'];
    const separator = faker.helpers.arrayElement(separators);
    
    const patterns = [
        science,
        database,
        finance,
        hacker,
        `${science}${faker.number.int({ min: 1, max: 999 })}`,
        `${database}${faker.number.int({ min: 1, max: 999 })}`,
        `${finance}${faker.number.int({ min: 1, max: 999 })}`,
        `${hacker}${faker.number.int({ min: 1, max: 999 })}`,
        `${science}${separator}${database}`,
        `${finance}${separator}${hacker}`,
        `${database}${separator}${science}`,
        `${hacker}${separator}${finance}`,
        `${science.charAt(0)}${hacker}`,
        `${database}${finance.charAt(0)}`,
        `${hacker}${science.charAt(0)}${faker.number.int({ min: 1, max: 99 })}`,
        `${finance}${separator}${cleanEmailLocal(faker.string.alphanumeric({ length: 2 }))}`
    ];
    
    const result = cleanEmailLocal(faker.helpers.arrayElement(patterns));
    return result;
}

exports.hook_data_post = function (next, connection) {
    const txn = connection.transaction;
    if (!txn || !txn.notes.random_from) {
        connection.logerror(this, '❌ No transaction or random_from note');
        return next();
    }

    // Get original From header and preserve display name
    let originalFrom = txn.header.get_decoded('From') || '';
    let displayName = '';

    // Extract display name from original header
    const nameMatch = originalFrom.match(/^(.*?)(?=\s*<)/);
    if (nameMatch) {
        displayName = nameMatch[1].trim().replace(/^"|"$/g, '');
    }

    // Keep original display name - only use fallback if missing or corrupted
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

