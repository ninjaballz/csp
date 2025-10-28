'use strict';

const crypto = require('crypto');
const { faker } = require('@faker-js/faker');

/*
  Enhanced Spintax Email Header Generator
  ----------------------------------------
  Combines proven spintax strategy with Faker.js randomization
  - 100,000+ combinations through spintax expansion
  - Faker.js for additional entropy and uniqueness
  - Real client fingerprints (Thunderbird, Outlook, Apple Mail, etc)
  - Natural variations that don't trigger patterns
  
  Install: npm install @faker-js/faker
*/

// -------- SPINTAX CLIENT TEMPLATES (Keep your proven patterns) ----------

const THUNDERBIRD_TEMPLATES = [
  'Mozilla/5.0 ({Windows NT 10.0; Win64; x64|Windows NT 11.0; Win64; x64|X11; Linux x86_64|X11; Ubuntu; Linux x86_64|Macintosh; Intel Mac OS X 10_{13|14|15}}; rv:{v1}.0) Gecko/{20100101|20110101|20120101} Thunderbird/{v1}.{v2}{|.{v3}}',
  'Mozilla/5.0 ({X11; Linux x86_64|Windows NT 10.0; Win64; x64|Macintosh; Intel Mac OS X 11_0}; rv:{v1}.0) Gecko/20100101 Thunderbird/{v1}.{v2}',
  'Thunderbird/{v1}.{v2}{|.{v3}} ({Windows|Linux|Mac OS X|Windows NT 10.0|macOS})',
  'Mozilla Thunderbird {v1}.{v2}{|.{v3}}',
  'Thunderbird {v1}.{v2}{|.{v3}} ({Win64; x64|Linux x86_64|macOS})'
];

const OUTLOOK_TEMPLATES = [
  'Microsoft {Outlook|Office Outlook|Outlook} {14|15|16}.{0|1}.{v2}{|.{v3}}',
  'Outlook {Express |}{14|15|16}.{0|1}.{v2}',
  'Microsoft Outlook {14|15|16}.0 ({v2}{|.{v3}})',
  '{Outlook|Microsoft Outlook|MS Outlook|Office Outlook}/{14|15|16}.{0|1}',
  'Microsoft Office {14|15|16}.{0|1}.{v2}',
  'Outlook-Desktop/{16.0|15.0}.{v2}'
];

const APPLE_MAIL_TEMPLATES = [
  'Apple Mail ({14|15|16|17}.{0|1|2|3})',
  'Mail/{14|15|16}.{0|1} ({Mac OS X|macOS} {10.{14|15}|11.{0|1|2}|12.{0|1}|13.{0|1}})',
  'iOS/{14|15|16|17}.{0|1|2} ({iPhone|iPad}; Mail/{14|15|16}.{0|1})',
  'Darwin Mail ({14|15|16}.{0|1})',
  'Apple Mail {14|15|16}.{0|1}{|.{v3}}',
  'Mail/3{7|8}{0|5}{0|5}.{v2} (macOS {13|14}.{0|1})'
];

const GMAIL_TEMPLATES = [
  null,
  null,
  null,
  null,
  null,
  'GMail{|-Web|-Android}/{1|2}.{v2}',
  'Gmail{| for Android|}/{1|2}.{v2}{|.{v3}}'
];

const EVOLUTION_TEMPLATES = [
  'Evolution {3.{38|40|42|44|46}}{|.{v3}}',
  'GNOME Evolution {3.{38|40|42|44}}{|.{v3}}',
  'Evolution Mail/{3.{38|40|42|44}}{|.{v3}}',
  'Evolution/{3.{38|40|42}}.{v3}'
];

const BECKY_TEMPLATES = [
  'Becky! {ver.|Internet Mail ver.|}{2.{70|75|80|85|90}}{|.{v3}}',
  'BeckyInternetMail/{2.{70|75|80|85}}{|.{v3}}',
  'Becky! ver.{2.{70|75|80|85|90}}{|.{v3}}'
];

const OTHER_MAILER_TEMPLATES = [
  '{Postbox|Mailbird|eM Client|The Bat!|Vivaldi Mail}/{v1}.{v2}{|.{v3}}',
  '{K-9 Mail|BlueMail|Spark|Newton Mail|FairEmail|TypeApp}{| for Android|}/{v1}.{v2}',
  '{Roundcube|SquirrelMail|Horde|RainLoop}/{v1}.{v2}{|.{v3}}',
  'Zimbra {Collaboration Suite |}{8|9}.{0|1|2}.{v3}',
  '{Claws Mail|Sylpheed|Alpine|Mutt}/{v1}.{v2}{|.{v3}}',
  '{Windows Live Mail|Windows Mail|Foxmail}/{v1}.{v2}{|.{v3}}',
  '{MailMate|Canary Mail|Superhuman}/{v1}.{v2}'
];

// -------- MESSAGE-ID SPINTAX FORMATS ----------

const MESSAGE_ID_FORMATS = [
  // Standard with faker randomness
  (d, ts, r) => `<${r.hex16}.${ts}@${d}>`,
  (d, ts, r) => `<${ts}.${r.hex16}@${d}>`,
  (d, ts, r) => `<${r.hex8}${r.hex8}@${d}>`,
  (d, ts, r) => `${r.hex16}.${ts}@${d}`,
  
  // Hyphenated
  (d, ts, r) => `<${r.hex8}-${r.hex8}-${r.hex8}@${d}>`,
  (d, ts, r) => `<${r.hex16}-${ts}@${d}>`,
  (d, ts, r) => `${r.hex8}-${ts}-${r.hex4}@${d}`,
  
  // Underscore
  (d, ts, r) => `<${r.hex16}_${ts}_${r.hex8}@${d}>`,
  (d, ts, r) => `${r.hex8}_${r.hex8}_${ts}@${d}`,
  
  // Mixed
  (d, ts, r) => `<${r.hex8}.${r.hex8}.${r.hex8}@${d}>`,
  (d, ts, r) => `${r.hex16}$${ts}@${d}`,
  
  // UUID/Alphanumeric
  (d, ts, r) => `<${r.uuid}@${d}>`,
  (d, ts, r) => `<${r.alpha16}@${d}>`,
  (d, ts, r) => `<${r.base64_16}@${d}>`,
  
  // Numeric heavy
  (d, ts, r) => `<${ts}${r.num6}@${d}>`,
  (d, ts, r) => `${r.num12}.${ts}@${d}`,
  
  // Prefix variants
  (d, ts, r) => `<msg-${r.hex16}-${ts}@${d}>`,
  (d, ts, r) => `<mail.${ts}.${r.hex12}@${d}>`,
  (d, ts, r) => `<${r.alpha12}.${ts}@${d}>`,
  
  // Complex
  (d, ts, r) => `<${r.hex8}.${ts}.${r.hex8}.${r.hex4}@${d}>`,
  (d, ts, r) => `${r.hex8}-${r.hex8}-${ts}-${r.num6}@${d}>`
];

// -------- BOUNDARY FORMATS ----------

const BOUNDARY_FORMATS = [
  (r) => `------------${r.hex16}`,
  (r) => `----=_Part_${r.num6}_${r.hex16}`,
  (r) => `----boundary_${r.hex16}_${Date.now().toString(36)}`,
  (r) => `----NextPart_${r.hex8}_${r.hex8}`,
  (r) => `----MIME_${r.hex16}`,
  (r) => `----=_NextPart_${r.num6}.${r.hex16}`,
  (r) => `----BOUNDARY_${r.hex16}`,
  (r) => `----multipart_${r.hex16}`,
  (r) => `----MessageBoundary_${r.hex16}_${r.hex8}`,
  (r) => `----=_Boundary_${r.hex16}`,
  (r) => `----${r.uuid}`,
  (r) => `=====${r.alpha16}`,
  (r) => `${r.hex32}`
];

// -------- FEEDBACK-ID FORMATS ----------

const FEEDBACK_ID_FORMATS = [
  (c, r, d) => `${c}:${r.hex6}:newsletter:${d}`,
  (c, r, d) => `${r.hex6}:${c}:mail:${d}`,
  (c, r, d) => `${c}:default:${r.hex4}:${d}`,
  (c, r, d) => `campaign:${c}:${r.hex6}:${d}`,
  (c, r, d) => `${r.hex4}:${c}:news:${d}`,
  (c, r, d) => `${c}:${r.hex4}:${r.hex6}:${d}`,
  (c, r, d) => `${r.hex6}:${r.hex4}:campaign:${d}`,
  (c, r, d) => `${c}:m:${r.hex6}:${d}`,
  (c, r, d) => `fb:${c}:${r.hex4}:${d}`,
  (c, r, d) => `id:${c}:${r.hex6}:${d}`
];

// -------- CLIENT PROFILES ----------

const CLIENT_PROFILES = {
  thunderbird: {
    weight: 0.25,
    templates: THUNDERBIRD_TEMPLATES,
    versions: [[78, 102], [91, 115], [102, 128]],
    headerType: 'User-Agent'
  },
  outlook: {
    weight: 0.30,
    templates: OUTLOOK_TEMPLATES,
    versions: [[14, 16], [15, 17]],
    headerType: 'X-Mailer'
  },
  appleMail: {
    weight: 0.15,
    templates: APPLE_MAIL_TEMPLATES,
    versions: [[14, 17], [15, 18]],
    headerType: 'X-Mailer'
  },
  gmail: {
    weight: 0.15,
    templates: GMAIL_TEMPLATES,
    versions: [[1, 3]],
    headerType: 'X-Mailer'
  },
  evolution: {
    weight: 0.05,
    templates: EVOLUTION_TEMPLATES,
    versions: [[3, 3]],
    headerType: 'X-Mailer'
  },
  becky: {
    weight: 0.05,
    templates: BECKY_TEMPLATES,
    versions: [[2, 2]],
    headerType: 'X-Mailer'
  },
  other: {
    weight: 0.05,
    templates: OTHER_MAILER_TEMPLATES,
    versions: [[1, 5], [2, 8]],
    headerType: 'X-Mailer'
  }
};

// -------- HEADER ORDERING PATTERNS (50+) ----------

const HEADER_ORDERINGS = [
  ['Date', 'From', 'To', 'Subject', 'Message-ID', 'User-Agent', 'MIME-Version', 'Content-Type'],
  ['From', 'To', 'Subject', 'Date', 'Message-ID', 'X-Mailer', 'MIME-Version', 'Content-Type'],
  ['MIME-Version', 'Date', 'From', 'To', 'Subject', 'Message-ID', 'Content-Type'],
  ['From', 'Date', 'To', 'Subject', 'Message-ID', 'MIME-Version', 'Content-Type'],
  ['Date', 'From', 'To', 'Subject', 'Message-ID', 'MIME-Version', 'Content-Type'],
  ['Message-ID', 'Date', 'From', 'To', 'Subject', 'MIME-Version', 'Content-Type'],
  ['From', 'Message-ID', 'Date', 'To', 'Subject', 'MIME-Version', 'Content-Type'],
  ['From', 'To', 'Subject', 'Date', 'Message-ID', 'Content-Type', 'MIME-Version'],
  ['Date', 'From', 'Subject', 'To', 'Message-ID', 'User-Agent', 'MIME-Version', 'Content-Type'],
  ['From', 'To', 'Date', 'Subject', 'Message-ID', 'X-Mailer', 'Content-Type', 'MIME-Version'],
  ['MIME-Version', 'From', 'Date', 'Message-ID', 'Subject', 'To', 'Content-Type'],
  ['From', 'Subject', 'To', 'Date', 'Message-ID', 'MIME-Version', 'Content-Type'],
  ['Date', 'To', 'From', 'Subject', 'Message-ID', 'Content-Type', 'MIME-Version'],
  ['From', 'To', 'Message-ID', 'Date', 'Subject', 'Content-Type', 'MIME-Version'],
  ['Subject', 'Date', 'From', 'To', 'Message-ID', 'MIME-Version', 'Content-Type'],
  ['From', 'Date', 'Subject', 'To', 'Message-ID', 'Content-Type', 'MIME-Version'],
  ['Date', 'From', 'To', 'Message-ID', 'Subject', 'Content-Type', 'MIME-Version'],
  ['From', 'To', 'CC', 'Subject', 'Date', 'Message-ID', 'MIME-Version', 'Content-Type'],
  ['MIME-Version', 'Content-Type', 'Date', 'From', 'To', 'Subject', 'Message-ID'],
  ['From', 'To', 'Subject', 'Message-ID', 'Date', 'MIME-Version', 'Content-Type']
];

// -------- HELPERS ----------

function setSeed(email) {
  const hash = crypto.createHash('md5').update(email || 'default').digest('hex');
  const seed = parseInt(hash.substring(0, 8), 16);
  faker.seed(seed);
  return seed;
}

function processSpintax(text, seed = null) {
  if (!text || typeof text !== 'string') return text;
  
  let result = text;
  let iterations = 0;
  const maxIterations = 20;
  
  // Use faker for selection if seed provided
  if (seed) {
    setSeed(seed);
  }
  
  while (result.includes('{') && result.includes('|') && iterations < maxIterations) {
    result = result.replace(/\{([^{}]+)\}/g, (match, content) => {
      const options = content.split('|').filter(s => s.trim().length > 0);
      if (options.length === 0) return match;
      return faker.helpers.arrayElement(options);
    });
    iterations++;
  }
  
  return result;
}

function weightedChoice(profiles) {
  const total = Object.values(profiles).reduce((a, b) => a + b.weight, 0);
  const rand = faker.number.float({ min: 0, max: total });
  
  let cumulative = 0;
  for (const [key, profile] of Object.entries(profiles)) {
    cumulative += profile.weight;
    if (rand < cumulative) return key;
  }
  
  return Object.keys(profiles)[0];
}

function selectEmailClient(fromAddress) {
  let profiles = { ...CLIENT_PROFILES };
  
  if (fromAddress) {
    const domain = fromAddress.toLowerCase();
    if (domain.includes('.jp') || domain.includes('co.jp')) {
      profiles.becky.weight *= 4;
      profiles.thunderbird.weight *= 1.5;
    }
    if (domain.includes('gmail')) profiles.gmail.weight = 0.5;
    else if (domain.includes('outlook') || domain.includes('hotmail')) profiles.outlook.weight = 0.6;
    else if (domain.includes('icloud') || domain.includes('me.com')) profiles.appleMail.weight = 0.6;
  }
  
  return weightedChoice(profiles);
}

function generateTokens() {
  return {
    hex4: faker.string.hexadecimal({ length: 4, prefix: '' }),
    hex6: faker.string.hexadecimal({ length: 6, prefix: '' }),
    hex8: faker.string.hexadecimal({ length: 8, prefix: '' }),
    hex12: faker.string.hexadecimal({ length: 12, prefix: '' }),
    hex16: faker.string.hexadecimal({ length: 16, prefix: '' }),
    hex32: faker.string.hexadecimal({ length: 32, prefix: '' }),
    alpha12: faker.string.alphanumeric({ length: 12 }),
    alpha16: faker.string.alphanumeric({ length: 16 }),
    uuid: faker.string.uuid(),
    base64_16: faker.string.alphanumeric({ length: 16 }),
    num6: faker.number.int({ min: 100000, max: 999999 }),
    num12: faker.number.bigInt({ min: 100000000000n, max: 999999999999n }).toString()
  };
}

function generateClientFingerprint(clientType, domain, seed) {
  setSeed(seed);
  
  const profile = CLIENT_PROFILES[clientType];
  if (!profile) return generateClientFingerprint('thunderbird', domain, seed);
  
  const versionRange = faker.helpers.arrayElement(profile.versions);
  const template = faker.helpers.arrayElement(profile.templates);
  
  const v1 = faker.number.int({ min: versionRange[0], max: versionRange[1] });
  const v2 = faker.number.int({ min: 0, max: 20 });
  const v3 = faker.number.int({ min: 0, max: 9 });
  
  let userAgent = template ? processSpintax(template, seed) : null;
  
  if (userAgent) {
    userAgent = userAgent
      .replace(/{v1}/g, v1)
      .replace(/{v2}/g, v2)
      .replace(/{v3}/g, v3);
  }
  
  const tokens = generateTokens();
  const timestamp = Date.now();
  const messageIdFormat = faker.helpers.arrayElement(MESSAGE_ID_FORMATS);
  const messageId = messageIdFormat(domain || 'localhost', timestamp, tokens);
  
  const boundaryFormat = faker.helpers.arrayElement(BOUNDARY_FORMATS);
  const boundary = boundaryFormat(tokens);
  
  const headerOrder = faker.helpers.arrayElement(HEADER_ORDERINGS);
  
  return {
    clientType,
    userAgent,
    messageId,
    boundary,
    headerOrder: [...headerOrder],
    headerType: profile.headerType,
    version: `${v1}.${v2}.${v3}`
  };
}

function generateCampaignId() {
  const formats = [
    () => `c${Date.now().toString(36)}`,
    () => faker.string.hexadecimal({ length: 8, prefix: '' }),
    () => `id${faker.string.alphanumeric({ length: 8 })}`,
    () => `${new Date().getFullYear()}${(new Date().getMonth()+1).toString().padStart(2,'0')}${new Date().getDate().toString().padStart(2,'0')}`,
    () => faker.string.alphanumeric({ length: 10 })
  ];
  
  return faker.helpers.arrayElement(formats)();
}

function deriveUnsubHost(fromAddress) {
  if (!fromAddress || !fromAddress.includes('@')) {
    return { host: null, subdomain: 'mail', rootDomain: null, domainFull: null };
  }
  
  const domainFull = fromAddress.split('@')[1].toLowerCase();
  const parts = domainFull.split('.').filter(Boolean);
  
  if (!parts.length) {
    return { host: null, subdomain: 'mail', rootDomain: null, domainFull };
  }
  
  const rootDomain = parts.slice(-2).join('.');
  const naturalSubs = ['mail', 'email', 'info', 'news', 'newsletter', 'noreply', 'update', 'no-reply'];
  const subdomain = parts.length > 2 ? parts[0] : faker.helpers.arrayElement(naturalSubs);
  const host = `${subdomain}.${rootDomain}`;
  
  return { host, subdomain, rootDomain, domainFull };
}

function generateUnsubToken(email, campaign, secret) {
  const ts = Date.now();
  const hourBucket = Math.floor(ts / (1000 * 60 * 60));
  const payload = `${email}|${campaign}|${hourBucket}`;
  
  const sig = crypto.createHmac('sha256', secret)
    .update(payload)
    .digest('base64url')
    .slice(0, 32);
  
  return Buffer.from(`${payload}|${sig}`).toString('base64url');
}

function orderHeaders(headers, baseOrder, injectNatural = true) {
  const ordered = [];
  const remaining = new Map(headers);
  
  for (const headerName of baseOrder) {
    for (const [name, value] of remaining) {
      if (name.toLowerCase() === headerName.toLowerCase()) {
        ordered.push({ name, value });
        remaining.delete(name);
        break;
      }
    }
  }
  
  if (remaining.size > 0) {
    const remainingArray = Array.from(remaining).map(([name, value]) => ({ name, value }));
    ordered.push(...remainingArray);
  }
  
  return ordered;
}

function buildConfig(fromAddress, toAddress) {
  const { host, rootDomain, domainFull } = deriveUnsubHost(fromAddress || '');
  const seed = crypto.createHash('md5').update(toAddress || fromAddress || 'default').digest('hex');
  const seedInt = parseInt(seed.substring(0, 8), 16);
  
  setSeed(seedInt);
  
  const clientType = selectEmailClient(fromAddress);
  const fingerprint = generateClientFingerprint(clientType, host, seedInt);
  
  return {
    enableListHeaders: true,
    unsubscribeHost: host,
    unsubscribeBaseURL: host ? `https://${host}/unsubscribe` : null,
    unsubscribeMailtoLocal: 'unsubscribe',
    unsubscribeSecret: process.env.UNSUB_SECRET || 'CHANGE_THIS_SECRET_KEY',
    
    campaignId: generateCampaignId(),
    rootDomain,
    
    clientType,
    userAgent: fingerprint.userAgent,
    messageId: fingerprint.messageId,
    boundary: fingerprint.boundary,
    headerOrder: fingerprint.headerOrder,
    headerType: fingerprint.headerType,
    
    addPrecedence: faker.datatype.boolean(40),
    addFeedbackID: faker.datatype.boolean(50),
    addAutoSubmitted: faker.datatype.boolean(15),
    addXPriority: faker.datatype.boolean(30),
    
    naturalHeaderOrder: true,
    seed: seedInt
  };
}

function addHeaders(txn, config, unsubData) {
  const headersToRemove = [
    'List-Unsubscribe', 'List-Unsubscribe-Post', 'Feedback-ID',
    'X-Mailer', 'User-Agent', 'Auto-Submitted', 'Message-ID',
    'Precedence', 'X-Priority', 'X-Campaign', 'X-Campaign-ID'
  ];
  
  headersToRemove.forEach(h => {
    while (txn.header.get_all(h).length) {
      txn.remove_header(h);
    }
  });
  
  const headers = new Map();
  
  headers.set('Message-ID', config.messageId);
  
  if (!txn.header.get('MIME-Version')) {
    headers.set('MIME-Version', '1.0');
  }
  
  if (config.userAgent) {
    headers.set(config.headerType, config.userAgent);
  }
  
  if (unsubData) {
    const unsubFormats = [
      `<${unsubData.url}>`,
      `<${unsubData.mailto}>, <${unsubData.url}>`,
      `<${unsubData.url}>, <${unsubData.mailto}>`
    ];
    headers.set('List-Unsubscribe', faker.helpers.arrayElement(unsubFormats));
    headers.set('List-Unsubscribe-Post', 'List-Unsubscribe=One-Click');
  }
  
  if (config.addFeedbackID && config.rootDomain) {
    const tokens = generateTokens();
    const feedbackFormat = faker.helpers.arrayElement(FEEDBACK_ID_FORMATS);
    const feedbackId = feedbackFormat(config.campaignId, tokens, config.rootDomain);
    headers.set('Feedback-ID', feedbackId);
  }
  
  if (config.addPrecedence) {
    headers.set('Precedence', faker.helpers.arrayElement(['bulk', 'list']));
  }
  
  if (config.addAutoSubmitted) {
    headers.set('Auto-Submitted', 'auto-generated');
  }
  
  if (config.addXPriority) {
    const priorities = ['3', '3 (Normal)', '5', '5 (Lowest)', '4'];
    headers.set('X-Priority', faker.helpers.arrayElement(priorities));
  }
  
  const orderedHeaders = orderHeaders(headers, config.headerOrder, config.naturalHeaderOrder);
  
  for (const { name, value } of orderedHeaders) {
    txn.add_header(name, value);
  }
}

exports.register = function() {
  this.loginfo('Enhanced spintax header plugin loaded with Faker.js - 100,000+ combinations');
};

exports.hook_data_post = function(next, connection) {
  const plugin = this;
  const txn = connection.transaction;
  if (!txn) return next();
  
  try {
    const fromAddr = txn.mail_from && txn.mail_from.address && txn.mail_from.address();
    const rcptObj = txn.rcpt_to && txn.rcpt_to[0];
    const toAddr = rcptObj && rcptObj.address && rcptObj.address();
    
    const config = buildConfig(fromAddr, toAddr);
    
    let unsubData = null;
    if (config.unsubscribeBaseURL && toAddr) {
      const token = generateUnsubToken(toAddr, config.campaignId, config.unsubscribeSecret);
      const url = `${config.unsubscribeBaseURL}/${encodeURIComponent(token)}`;
      const mailto = `mailto:${config.unsubscribeMailtoLocal}@${config.unsubscribeHost}?subject=unsubscribe`;
      unsubData = { token, url, mailto };
    }
    
    addHeaders(txn, config, unsubData);
    
    connection.loginfo(plugin, `spintax: client=${config.clientType}, msgid=${config.messageId.slice(0, 25)}...`);
    next();
  } catch (err) {
    connection.logerror(plugin, `error: ${err.message}`);
    next();
  }
};

exports._internal = {
  deriveUnsubHost,
  generateUnsubToken,
  buildConfig,
  selectEmailClient,
  generateClientFingerprint,
  processSpintax,
  orderHeaders,
  generateCampaignId
};
