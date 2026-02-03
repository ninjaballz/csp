const { faker } = require('@faker-js/faker');
const { Buffer } = require('buffer');
const crypto = require('crypto');

// Helper function to clean and ensure valid email local part
function cleanEmailLocal(str) {
    if (!str || str.length === 0) return 'user';
    return str.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^a-z0-9._-]/g, '')
        .replace(/^[._-]+|[._-]+$/g, '')
        .replace(/[._-]{2,}/g, '.') // No consecutive separators
        .substring(0, 64) || 'user';
}

// Generate crypto-random entropy
function cryptoSeed() {
    const bytes = crypto.randomBytes(4);
    return bytes.readUInt32BE(0);
}

// Add natural variation to numbers
function naturalNumber(min, max) {
    // Weighted towards common years/numbers
    const weights = [
        { range: [1980, 1995], weight: 0.25 },
        { range: [1996, 2005], weight: 0.40 },
        { range: [2006, 2010], weight: 0.20 },
        { range: [1, 99], weight: 0.15 }
    ];
    
    const rand = Math.random();
    let cumulative = 0;
    
    for (const w of weights) {
        cumulative += w.weight;
        if (rand < cumulative && max >= w.range[0] && min <= w.range[1]) {
            const wMin = Math.max(min, w.range[0]);
            const wMax = Math.min(max, w.range[1]);
            return faker.number.int({ min: wMin, max: wMax });
        }
    }
    
    return faker.number.int({ min, max });
}

// Generate random display name using faker
function generateDisplayName() {
    const strategies = [
        // Person names
        () => faker.person.firstName(),
        () => faker.person.lastName(),
        () => `${faker.person.firstName()} ${faker.person.lastName()}`,
        () => faker.person.fullName(),
        
        // Company/Business
        () => faker.company.name(),
        () => faker.company.buzzPhrase().split(' ').slice(0, 2).join(' '),
        () => faker.commerce.department(),
        
        // Generic terms
        () => faker.word.adjective(),
        () => faker.word.noun(),
        () => `${faker.word.adjective()} ${faker.word.noun()}`,
        
        // Product names
        () => faker.commerce.productName().split(' ').slice(0, 2).join(' '),
        () => faker.commerce.product(),
        
        // Internet/Tech
        () => faker.internet.displayName(),
        () => faker.hacker.noun(),
        () => `${faker.hacker.adjective()} ${faker.hacker.noun()}`,
        
        // Creative combinations
        () => `${faker.color.human()} ${faker.animal.type()}`,
        () => faker.music.genre(),
        () => faker.vehicle.vehicle(),
        
        // Location-based
        () => faker.location.city(),
        () => faker.location.country(),
    ];
    
    const generator = faker.helpers.arrayElement(strategies);
    let name = generator();
    
    // Capitalize first letter of each word
    name = name.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    
    // Limit length
    return name.substring(0, 50);
}

exports.register = function () {
    this.loginfo("🔄 Plugin random_email_generator - Fully randomized with faker.js");
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

        // Reseed faker with crypto entropy for each email
        faker.seed(cryptoSeed());

        // Generate random local with domain-aware strategy
        const local = generateRandomLocal(domain);

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

function generateRandomLocal(domain) {
    // Domain-based strategy weighting
    const isDotJp = domain.includes('.jp') || domain.includes('co.jp');
    const isCommon = ['gmail', 'yahoo', 'outlook', 'hotmail', 'icloud'].some(d => domain.includes(d));
    
    let strategies;
    
    if (isDotJp) {
        // Japanese domains prefer person names + numbers
        strategies = [
            { name: 'person_simple', weight: 0.35 },
            { name: 'person_numbered', weight: 0.30 },
            { name: 'person_dotted', weight: 0.20 },
            { name: 'random_words', weight: 0.10 },
            { name: 'internet_usernames', weight: 0.05 }
        ];
    } else if (isCommon) {
        // Common providers use diverse patterns
        strategies = [
            { name: 'person_simple', weight: 0.25 },
            { name: 'person_numbered', weight: 0.20 },
            { name: 'internet_usernames', weight: 0.15 },
            { name: 'random_words', weight: 0.15 },
            { name: 'hobby_related', weight: 0.10 },
            { name: 'color_animal', weight: 0.10 },
            { name: 'location_based', weight: 0.05 }
        ];
    } else {
        // Business/other domains prefer professional patterns
        strategies = [
            { name: 'person_simple', weight: 0.30 },
            { name: 'person_dotted', weight: 0.25 },
            { name: 'person_initial', weight: 0.20 },
            { name: 'company_related', weight: 0.15 },
            { name: 'department', weight: 0.10 }
        ];
    }
    
    const strategy = weightedChoice(strategies);
    return generateByStrategy(strategy);
}

function weightedChoice(strategies) {
    const total = strategies.reduce((sum, s) => sum + s.weight, 0);
    let rand = Math.random() * total;
    
    for (const strategy of strategies) {
        rand -= strategy.weight;
        if (rand <= 0) return strategy.name;
    }
    
    return strategies[0].name;
}

function generateByStrategy(strategy) {
    switch (strategy) {
        case 'person_simple':
            return generatePersonSimple();
        case 'person_numbered':
            return generatePersonNumbered();
        case 'person_dotted':
            return generatePersonDotted();
        case 'person_initial':
            return generatePersonInitial();
        case 'internet_usernames':
            return generateInternetUsername();
        case 'random_words':
            return generateRandomWords();
        case 'company_related':
            return generateCompanyRelated();
        case 'department':
            return generateDepartment();
        case 'hobby_related':
            return generateHobby();
        case 'color_animal':
            return generateColorAnimal();
        case 'location_based':
            return generateLocation();
        default:
            return generatePersonSimple();
    }
}

// STRATEGY 1: Simple person names (most common)
function generatePersonSimple() {
    const firstName = cleanEmailLocal(faker.person.firstName());
    const lastName = cleanEmailLocal(faker.person.lastName());
    
    const patterns = [
        `${firstName}${lastName}`,
        `${lastName}${firstName}`,
        `${firstName}`,
        `${lastName}`
    ];
    
    return faker.helpers.arrayElement(patterns);
}

// STRATEGY 2: Person + number (very common)
function generatePersonNumbered() {
    const firstName = cleanEmailLocal(faker.person.firstName());
    const lastName = cleanEmailLocal(faker.person.lastName());
    
    const num = naturalNumber(1, 9999);
    
    const patterns = [
        `${firstName}${num}`,
        `${lastName}${num}`,
        `${firstName}${lastName}${num}`,
        `${firstName}${lastName.charAt(0)}${num}`,
        `${firstName.charAt(0)}${lastName}${num}`
    ];
    
    return faker.helpers.arrayElement(patterns);
}

// STRATEGY 3: Dotted names (professional)
function generatePersonDotted() {
    const firstName = cleanEmailLocal(faker.person.firstName());
    const lastName = cleanEmailLocal(faker.person.lastName());
    const middleName = cleanEmailLocal(faker.person.middleName());
    
    const patterns = [
        `${firstName}.${lastName}`,
        `${lastName}.${firstName}`,
        `${firstName}.${lastName.charAt(0)}`,
        `${firstName.charAt(0)}.${lastName}`,
        `${firstName}.${middleName}.${lastName}`
    ];
    
    return faker.helpers.arrayElement(patterns);
}

// STRATEGY 4: Initial-based (professional)
function generatePersonInitial() {
    const firstName = cleanEmailLocal(faker.person.firstName());
    const lastName = cleanEmailLocal(faker.person.lastName());
    const middleName = cleanEmailLocal(faker.person.middleName());
    
    const patterns = [
        `${firstName.charAt(0)}${lastName}`,
        `${lastName}${firstName.charAt(0)}`,
        `${firstName.charAt(0)}.${lastName}`,
        `${firstName.charAt(0)}${middleName.charAt(0)}${lastName}`,
        `${firstName}${lastName.charAt(0)}`
    ];
    
    return faker.helpers.arrayElement(patterns);
}

// STRATEGY 5: Internet usernames
function generateInternetUsername() {
    const username = cleanEmailLocal(faker.internet.userName());
    const domainWord = cleanEmailLocal(faker.internet.domainWord());
    
    if (Math.random() < 0.5) {
        const num = naturalNumber(1, 999);
        return `${username}${num}`;
    }
    
    return Math.random() < 0.5 ? username : domainWord;
}

// STRATEGY 6: Random words (creative)
function generateRandomWords() {
    const adj = cleanEmailLocal(faker.word.adjective()).substring(0, 10);
    const noun = cleanEmailLocal(faker.word.noun()).substring(0, 10);
    
    const patterns = [
        adj,
        noun,
        `${adj}${noun}`,
        `${adj}.${noun}`,
        `${adj}${naturalNumber(1, 99)}`,
        `${noun}${naturalNumber(1, 99)}`
    ];
    
    return faker.helpers.arrayElement(patterns);
}

// STRATEGY 7: Company-related
function generateCompanyRelated() {
    const company = cleanEmailLocal(faker.company.name().split(' ')[0]).substring(0, 12);
    const buzzword = cleanEmailLocal(faker.company.buzzPhrase().split(' ')[0]).substring(0, 10);
    
    const patterns = [
        company,
        buzzword,
        `${company}${naturalNumber(1, 99)}`,
        `${buzzword}${naturalNumber(1, 99)}`,
        `${company}.${buzzword}`
    ];
    
    return faker.helpers.arrayElement(patterns);
}

// STRATEGY 8: Department names (fully random using faker)
function generateDepartment() {
    // Use faker to generate department-like names
    const sources = [
        () => cleanEmailLocal(faker.commerce.department()),
        () => cleanEmailLocal(faker.company.buzzNoun()),
        () => cleanEmailLocal(faker.hacker.noun()),
        () => cleanEmailLocal(faker.word.noun()),
        () => cleanEmailLocal(faker.finance.accountName().split(' ')[0])
    ];
    
    const generator = faker.helpers.arrayElement(sources);
    const dept = generator().substring(0, 12);
    
    if (Math.random() < 0.3) {
        return `${dept}${naturalNumber(1, 9)}`;
    }
    
    return dept;
}

// STRATEGY 9: Hobby-related
function generateHobby() {
    const sources = [
        () => cleanEmailLocal(faker.music.genre()),
        () => cleanEmailLocal(faker.vehicle.type()),
        () => cleanEmailLocal(faker.animal.type()),
        () => cleanEmailLocal(faker.color.human()),
        () => cleanEmailLocal(faker.commerce.product())
    ];
    
    const generator = faker.helpers.arrayElement(sources);
    const hobby = generator().substring(0, 10);
    
    const patterns = [
        hobby,
        `${hobby}${naturalNumber(1, 99)}`
    ];
    
    return faker.helpers.arrayElement(patterns);
}

// STRATEGY 10: Color + Animal
function generateColorAnimal() {
    const color = cleanEmailLocal(faker.color.human()).substring(0, 10);
    const animal = cleanEmailLocal(faker.animal.type()).substring(0, 10);
    
    const patterns = [
        `${color}${animal}`,
        `${animal}${color}`,
        `${color}${animal}${naturalNumber(1, 99)}`,
        `${animal}${naturalNumber(1, 99)}`
    ];
    
    return faker.helpers.arrayElement(patterns);
}

// STRATEGY 11: Location-based
function generateLocation() {
    const sources = [
        () => cleanEmailLocal(faker.location.city()),
        () => cleanEmailLocal(faker.location.state()),
        () => cleanEmailLocal(faker.location.country()),
        () => cleanEmailLocal(faker.location.street().split(' ')[0])
    ];
    
    const generator = faker.helpers.arrayElement(sources);
    const location = generator().substring(0, 12);
    
    const patterns = [
        location,
        `${location}${naturalNumber(1, 99)}`
    ];
    
    return faker.helpers.arrayElement(patterns);
}

exports.hook_data_post = function (next, connection) {
    const txn = connection.transaction;
    if (!txn || !txn.notes.random_from) {
        connection.logerror(this, '❌ No transaction or random_from note');
        return next();
    }

    // Reseed faker for display name generation
    faker.seed(cryptoSeed());

    // Get original From header and preserve display name
    let originalFrom = txn.header.get_decoded('From') || '';
    let displayName = '';

    // Extract display name from original header (more robust parsing)
    if (originalFrom.includes('<')) {
        const match = originalFrom.match(/^(.+?)\s*</);
        if (match) {
            displayName = match[1].trim().replace(/^["']|["']$/g, '');
        }
    } else {
        // No angle brackets, might be just email
        const parts = originalFrom.split('@');
        if (parts.length > 0) {
            displayName = parts[0].trim();
        }
    }

    // Generate random display name if missing or corrupted
    if (!displayName || /�/.test(displayName) || displayName.length === 0) {
        displayName = generateDisplayName();
    }

    // Encode display name if contains non-ASCII
    const needsEncoding = /[^\x00-\x7F]/.test(displayName);
    let encodedName;
    
    if (needsEncoding) {
        const encoded = Buffer.from(displayName, 'utf8').toString('base64');
        encodedName = `=?UTF-8?B?${encoded}?=`;
    } else if (displayName.match(/[,<>@]/)) {
        // Quote if contains special chars
        encodedName = `"${displayName.replace(/"/g, '\\"')}"`;
    } else if (displayName.includes(' ')) {
        // Quote if contains spaces
        encodedName = `"${displayName}"`;
    } else {
        encodedName = displayName;
    }

    // Set new From with display name + random email
    const fromHeader = `${encodedName} <${txn.notes.random_from}>`;

    connection.loginfo(this, `📧 From: ${fromHeader}`);
    
    // Remove and add headers
    txn.remove_header('From');
    txn.add_header('From', fromHeader);
    
    // Reply-To uses just the email
    txn.remove_header('Reply-To');
    txn.add_header('Reply-To', txn.notes.random_from);
    
    // Add Sender header for authenticity (optional, 30% of time)
    if (Math.random() < 0.3) {
        txn.remove_header('Sender');
        txn.add_header('Sender', txn.notes.random_from);
    }

    next();
};
