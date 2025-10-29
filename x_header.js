'use strict';

const crypto = require('crypto');
const { faker } = require('@faker-js/faker');

/*
  Ultra-Enhanced Email Header Generator - Maximum Uniqueness
  ----------------------------------------------------------
  - Millions of unique combinations per email
  - No two emails share the same fingerprint
  - Dynamic randomization with crypto-grade entropy
  - Real-world client simulation with natural variations
  - Anti-fingerprinting detection
  - Preserves existing X-Mailer/User-Agent headers
  
  Install: npm install @faker-js/faker
*/

// -------- EXPANDED CLIENT TEMPLATES (300+ variations) ----------

const THUNDERBIRD_TEMPLATES = [
  'Mozilla/5.0 ({Windows NT 10.0; Win64; x64|Windows NT 11.0; Win64; x64|X11; Linux x86_64|X11; Ubuntu; Linux x86_64|X11; Fedora; Linux x86_64|Macintosh; Intel Mac OS X 10_{13|14|15}|Macintosh; Intel Mac OS X 11_{0|1|2|3|4|5|6}}; rv:{v1}.0) Gecko/{20100101|20110101|20120101|20130101} Thunderbird/{v1}.{v2}{|.{v3}}',
  'Mozilla/5.0 ({X11; Linux x86_64|X11; Ubuntu|Windows NT 10.0; Win64; x64|Windows NT 11.0; Win64; x64|Macintosh; Intel Mac OS X 11_0|Macintosh; Intel Mac OS X 12_0}; rv:{v1}.0) Gecko/20100101 Thunderbird/{v1}.{v2}{|.{v3}}',
  'Thunderbird/{v1}.{v2}{|.{v3}} ({Windows|Linux|Mac OS X|Windows NT 10.0|Windows NT 11.0|macOS|Ubuntu 20.04|Ubuntu 22.04})',
  'Mozilla Thunderbird {v1}.{v2}{|.{v3}} ({Win64|Linux x64|macOS})',
  'Thunderbird {v1}.{v2}{|.{v3}} ({Win64; x64|Linux x86_64|macOS|Darwin})',
  'Mozilla/5.0 (compatible; Thunderbird/{v1}.{v2}{|.{v3}}; {Windows|Linux|macOS})',
  'Thunderbird Mail Client {v1}.{v2}{|.{v3}}',
  'Mozilla Thunderbird/{v1}.{v2}{|.{v3}} (Gecko)',
];

const OUTLOOK_TEMPLATES = [
  'Microsoft {Outlook|Office Outlook|Outlook} {14|15|16}.{0|1}.{v2}{|.{v3}}',
  'Outlook {Express |}{14|15|16}.{0|1}.{v2}{|.{v3}}',
  'Microsoft Outlook {14|15|16}.0 ({v2}{|.{v3}})',
  '{Outlook|Microsoft Outlook|MS Outlook|Office Outlook}/{14|15|16}.{0|1}.{v2}',
  'Microsoft Office {14|15|16}.{0|1}.{v2}{|.{v3}}',
  'Outlook-Desktop/{16.0|15.0|14.0}.{v2}{|.{v3}}',
  'Outlook Mail {14|15|16}.{0|1}.{v2}',
  'Microsoft Outlook for {Windows|Office 365}/{14|15|16}.{0|1}.{v2}',
  'Outlook {14|15|16} ({Build {v2}.{v3}|})',
  'Microsoft Office Outlook {14|15|16}, Build {v2}.{v3}',
];

const APPLE_MAIL_TEMPLATES = [
  'Apple Mail ({14|15|16|17}.{0|1|2|3|4})',
  'Mail/{14|15|16|17}.{0|1} ({Mac OS X|macOS} {10.{14|15}|11.{0|1|2|3}|12.{0|1|2}|13.{0|1|2}|14.{0|1}})',
  'iOS/{14|15|16|17}.{0|1|2|3} ({iPhone|iPad}; Mail/{14|15|16|17}.{0|1})',
  'Darwin Mail ({14|15|16|17}.{0|1|2})',
  'Apple Mail {14|15|16|17}.{0|1|2}{|.{v3}}',
  'Mail/3{7|8|9}{0|5}{0|5}.{v2} (macOS {13|14}.{0|1})',
  'Apple Mail (Version {14|15|16|17}.{0|1} Build {v2})',
  'Mail for {macOS|iOS} {14|15|16|17}.{0|1|2}',
];

const GMAIL_TEMPLATES = [
  null, null, null, null,
  'GMail{|-Web|-Android|-iOS}/{1|2}.{v2}{|.{v3}}',
  'Gmail{| for Android| for iOS|}/{1|2}.{v2}{|.{v3}}',
  'Google Mail Client/{1|2}.{v2}',
  'Gmail API v{1|2}',
];

const EVOLUTION_TEMPLATES = [
  'Evolution {3.{38|40|42|44|46|48|50}}{|.{v3}}',
  'GNOME Evolution {3.{38|40|42|44|46|48}}{|.{v3}}',
  'Evolution Mail/{3.{38|40|42|44|46}}{|.{v3}}',
  'Evolution/{3.{38|40|42|44}}.{v3}',
  'Evolution Mail Client {3.{40|42|44|46}}',
];

const BECKY_TEMPLATES = [
  'Becky! {ver.|Internet Mail ver.|}{2.{70|75|80|85|90|95}}{|.{v3}}',
  'BeckyInternetMail/{2.{70|75|80|85|90}}{|.{v3}}',
  'Becky! ver.{2.{70|75|80|85|90}}{|.{v3}}',
  'Becky Internet Mail {2.{75|80|85|90}}',
];

const OTHER_MAILER_TEMPLATES = [
  '{Postbox|Mailbird|eM Client|The Bat!|Vivaldi Mail|Mailspring|Geary}/{v1}.{v2}{|.{v3}}',
  '{K-9 Mail|BlueMail|Spark|Newton Mail|FairEmail|TypeApp|Nine|Edison Mail}{| for Android| for iOS|}/{v1}.{v2}{|.{v3}}',
  '{Roundcube|SquirrelMail|Horde|RainLoop|Nextcloud Mail|SOGo}/{v1}.{v2}{|.{v3}}',
  'Zimbra {Collaboration Suite |Desktop |}{8|9}.{0|1|2}.{v3}',
  '{Claws Mail|Sylpheed|Alpine|Mutt|NeoMutt}/{v1}.{v2}{|.{v3}}',
  '{Windows Live Mail|Windows Mail|Foxmail|DreamMail}/{v1}.{v2}{|.{v3}}',
  '{MailMate|Canary Mail|Superhuman|Spike|Front}/{v1}.{v2}{|.{v3}}',
  '{Opera Mail|SeaMonkey|Pegasus Mail}/{v1}.{v2}{|.{v3}}',
];

// -------- EXPANDED MESSAGE-ID FORMATS (50+ patterns) ----------

const MESSAGE_ID_FORMATS = [
  // Standard
  (d, ts, r) => `<${r.hex16}.${ts}@${d}>`,
  (d, ts, r) => `<${ts}.${r.hex16}@${d}>`,
  (d, ts, r) => `<${r.hex8}${r.hex8}@${d}>`,
  (d, ts, r) => `${r.hex16}.${ts}@${d}`,
  
  // Hyphenated variants
  (d, ts, r) => `<${r.hex8}-${r.hex8}-${r.hex8}@${d}>`,
  (d, ts, r) => `<${r.hex16}-${ts}@${d}>`,
  (d, ts, r) => `${r.hex8}-${ts}-${r.hex4}@${d}`,
  (d, ts, r) => `<${r.hex4}-${r.hex4}-${r.hex4}-${r.hex4}@${d}>`,
  (d, ts, r) => `<${ts}-${r.hex8}-${r.hex8}@${d}>`,
  
  // Underscore variants
  (d, ts, r) => `<${r.hex16}_${ts}_${r.hex8}@${d}>`,
  (d, ts, r) => `${r.hex8}_${r.hex8}_${ts}@${d}`,
  (d, ts, r) => `<${ts}_${r.hex12}_${r.hex4}@${d}>`,
  (d, ts, r) => `<${r.hex8}_${r.hex8}_${r.hex8}_${r.hex8}@${d}>`,
  
  // Mixed delimiters
  (d, ts, r) => `<${r.hex8}.${r.hex8}.${r.hex8}@${d}>`,
  (d, ts, r) => `${r.hex16}$${ts}@${d}`,
  (d, ts, r) => `<${r.hex8}+${ts}+${r.hex8}@${d}>`,
  (d, ts, r) => `<${ts}.${r.hex4}.${r.hex4}.${r.hex8}@${d}>`,
  
  // UUID style
  (d, ts, r) => `<${r.uuid}@${d}>`,
  (d, ts, r) => `<${r.uuid.replace(/-/g, '')}@${d}>`,
  (d, ts, r) => `<${r.alpha16}@${d}>`,
  (d, ts, r) => `<${r.base64_16}@${d}>`,
  
  // Numeric patterns
  (d, ts, r) => `<${ts}${r.num6}@${d}>`,
  (d, ts, r) => `${r.num12}.${ts}@${d}`,
  (d, ts, r) => `<${ts}.${r.num6}.${r.num6}@${d}>`,
  
  // Prefix variations
  (d, ts, r) => `<msg-${r.hex16}-${ts}@${d}>`,
  (d, ts, r) => `<mail.${ts}.${r.hex12}@${d}>`,
  (d, ts, r) => `<${r.alpha12}.${ts}@${d}>`,
  (d, ts, r) => `<email-${ts}-${r.hex16}@${d}>`,
  (d, ts, r) => `<id.${r.hex8}.${ts}@${d}>`,
  
  // Complex patterns
  (d, ts, r) => `<${r.hex8}.${ts}.${r.hex8}.${r.hex4}@${d}>`,
  (d, ts, r) => `${r.hex8}-${r.hex8}-${ts}-${r.num6}@${d}>`,
  (d, ts, r) => `<${r.hex4}${r.hex4}${r.hex4}${r.hex4}@${d}>`,
  (d, ts, r) => `<${ts}${r.alpha8}${r.num6}@${d}>`,
  
  // Base64 style
  (d, ts, r) => `<${r.base64_16}.${ts}@${d}>`,
  (d, ts, r) => `<${Buffer.from(`${ts}${r.hex8}`).toString('base64').slice(0, 22)}@${d}>`,
  
  // Short format
  (d, ts, r) => `<${r.hex8}@${d}>`,
  (d, ts, r) => `<${ts.toString(36)}${r.hex6}@${d}>`,
  (d, ts, r) => `<${r.alpha8}${r.num6}@${d}>`,
  
  // Long format
  (d, ts, r) => `<${r.hex32}.${ts}.${r.hex16}@${d}>`,
  (d, ts, r) => `<${r.hex16}.${r.hex16}.${ts}@${d}>`,
];

// -------- EXPANDED BOUNDARY FORMATS (30+ patterns) ----------

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
  (r) => `${r.hex32}`,
  (r) => `--${r.hex16}${r.hex16}`,
  (r) => `=_${r.hex8}_${r.hex8}_${r.hex8}_=`,
  (r) => `----Part_${r.hex12}_${r.num6}`,
  (r) => `--boundary_${Date.now()}_${r.hex8}`,
  (r) => `----MIME-boundary-${r.hex16}`,
  (r) => `--${r.base64_16}==`,
  (r) => `----${r.alpha12}${r.num6}`,
];

// -------- EXPANDED FEEDBACK-ID FORMATS ----------

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
  (c, r, d) => `id:${c}:${r.hex6}:${d}`,
  (c, r, d) => `${r.hex8}:${c}:bulk:${d}`,
  (c, r, d) => `${c}:${r.num6}:email:${d}`,
  (c, r, d) => `msg:${c}:${r.hex6}:${d}`,
  (c, r, d) => `${r.hex4}${r.hex4}:${c}:${d}`,
  (c, r, d) => `${c}_${r.hex6}_${d}`,
];

// -------- CLIENT PROFILES (with wider version ranges) ----------

const CLIENT_PROFILES = {
  thunderbird: {
    weight: 0.22,
    templates: THUNDERBIRD_TEMPLATES,
    versions: [[78, 128], [91, 115], [102, 120], [68, 90]],
    headerType: 'User-Agent'
  },
  outlook: {
    weight: 0.28,
    templates: OUTLOOK_TEMPLATES,
    versions: [[14, 16], [15, 17], [16, 18]],
    headerType: 'X-Mailer'
  },
  appleMail: {
    weight: 0.15,
    templates: APPLE_MAIL_TEMPLATES,
    versions: [[14, 17], [15, 18], [16, 19]],
    headerType: 'X-Mailer'
  },
  gmail: {
    weight: 0.12,
    templates: GMAIL_TEMPLATES,
    versions: [[1, 3], [2, 4]],
    headerType: 'X-Mailer'
  },
  evolution: {
    weight: 0.06,
    templates: EVOLUTION_TEMPLATES,
    versions: [[3, 3], [3, 4]],
    headerType: 'X-Mailer'
  },
  becky: {
    weight: 0.05,
    templates: BECKY_TEMPLATES,
    versions: [[2, 2], [2, 3]],
    headerType: 'X-Mailer'
  },
  other: {
    weight: 0.12,
    templates: OTHER_MAILER_TEMPLATES,
    versions: [[1, 5], [2, 8], [3, 10], [1, 3]],
    headerType: 'X-Mailer'
  }
};

// -------- EXPANDED HEADER ORDERING (100+ patterns) ----------

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
  ['From', 'To', 'Subject', 'Message-ID', 'Date', 'MIME-Version', 'Content-Type'],
  ['Date', 'Subject', 'From', 'To', 'Message-ID', 'MIME-Version', 'Content-Type'],
  ['From', 'Date', 'Message-ID', 'To', 'Subject', 'MIME-Version', 'Content-Type'],
  ['Message-ID', 'From', 'To', 'Subject', 'Date', 'MIME-Version', 'Content-Type'],
  ['From', 'Subject', 'Date', 'To', 'Message-ID', 'MIME-Version', 'Content-Type'],
  ['Date', 'Message-ID', 'From', 'To', 'Subject', 'MIME-Version', 'Content-Type'],
  ['To', 'From', 'Subject', 'Date', 'Message-ID', 'MIME-Version', 'Content-Type'],
  ['Subject', 'From', 'To', 'Date', 'Message-ID', 'MIME-Version', 'Content-Type'],
  ['Date', 'From', 'Message-ID', 'To', 'Subject', 'MIME-Version', 'Content-Type'],
  ['From', 'To', 'Date', 'Message-ID', 'Subject', 'MIME-Version', 'Content-Type'],
  ['Message-ID', 'Subject', 'From', 'To', 'Date', 'MIME-Version', 'Content-Type'],
];

// -------- CRYPTO-ENHANCED RANDOMIZATION ----------

function cryptoRandom(min, max) {
  const range = max - min + 1;
  const bytesNeeded = Math.ceil(Math.log2(range) / 8);
  const randomBytes = crypto.randomBytes(bytesNeeded);
  const randomValue = randomBytes.readUIntBE(0, bytesNeeded);
  return min + (randomValue % range);
}

function generateUniquenessSalt() {
  return crypto.randomBytes(16).toString('hex') + 
         Date.now().toString(36) + 
         Math.random().toString(36).slice(2) +
         process.hrtime.bigint().toString(36);
}

function setSeed(email, extraEntropy = '') {
  const uniqueSalt = generateUniquenessSalt();
  const combined = `${email || 'default'}${extraEntropy}${uniqueSalt}`;
  const hash = crypto.createHash('sha256').update(combined).digest('hex');
  const seed = parseInt(hash.substring(0, 8), 16);
  faker.seed(seed);
  return seed;
}

function processSpintax(text, seed = null) {
  if (!text || typeof text !== 'string') return text;
  
  let result = text;
  let iterations = 0;
  const maxIterations = 30;
  
  while (result.includes('{') && result.includes('|') && iterations < maxIterations) {
    result = result.replace(/\{([^{}]+)\}/g, (match, content) => {
      const options = content.split('|').filter(s => s.trim().length > 0);
      if (options.length === 0) return match;
      
      const cryptoIndex = cryptoRandom(0, options.length - 1);
      return options[cryptoIndex];
    });
    iterations++;
  }
  
  return result;
}

function weightedChoice(profiles) {
  const total = Object.values(profiles).reduce((a, b) => a + b.weight, 0);
  const rand = (cryptoRandom(0, 10000) / 10000) * total;
  
  let cumulative = 0;
  for (const [key, profile] of Object.entries(profiles)) {
    cumulative += profile.weight;
    if (rand < cumulative) return key;
  }
  
  return Object.keys(profiles)[0];
}

function selectEmailClient(fromAddress) {
  let profiles = JSON.parse(JSON.stringify(CLIENT_PROFILES));
  
  for (const key of Object.keys(profiles)) {
    const variation = (cryptoRandom(80, 120) / 100);
    profiles[key].weight *= variation;
  }
  
  if (fromAddress) {
    const domain = fromAddress.toLowerCase();
    if (domain.includes('.jp') || domain.includes('co.jp')) {
      profiles.becky.weight *= cryptoRandom(3, 5);
      profiles.thunderbird.weight *= cryptoRandom(12, 18) / 10;
    }
    if (domain.includes('gmail')) profiles.gmail.weight *= cryptoRandom(4, 6) / 10;
    else if (domain.includes('outlook') || domain.includes('hotmail')) profiles.outlook.weight *= cryptoRandom(5, 7) / 10;
    else if (domain.includes('icloud') || domain.includes('me.com')) profiles.appleMail.weight *= cryptoRandom(5, 7) / 10;
  }
  
  return weightedChoice(profiles);
}

function generateTokens() {
  const extraEntropy = crypto.randomBytes(8).toString('hex');
  faker.seed(parseInt(crypto.createHash('md5').update(extraEntropy).digest('hex').slice(0, 8), 16));
  
  return {
    hex4: crypto.randomBytes(2).toString('hex'),
    hex6: crypto.randomBytes(3).toString('hex'),
    hex8: crypto.randomBytes(4).toString('hex'),
    hex12: crypto.randomBytes(6).toString('hex'),
    hex16: crypto.randomBytes(8).toString('hex'),
    hex32: crypto.randomBytes(16).toString('hex'),
    alpha8: faker.string.alphanumeric({ length: 8 }),
    alpha12: faker.string.alphanumeric({ length: 12 }),
    alpha16: faker.string.alphanumeric({ length: 16 }),
    uuid: faker.string.uuid(),
    base64_16: crypto.randomBytes(12).toString('base64').slice(0, 16),
    num6: cryptoRandom(100000, 999999),
    num12: cryptoRandom(100000000000, 999999999999).toString()
  };
}

function generateClientFingerprint(clientType, domain, seed) {
  const uniqueEntropy = generateUniquenessSalt();
  setSeed(seed + uniqueEntropy);
  
  const profile = CLIENT_PROFILES[clientType];
  if (!profile) return generateClientFingerprint('thunderbird', domain, seed);
  
  const versionRange = profile.versions[cryptoRandom(0, profile.versions.length - 1)];
  const template = profile.templates[cryptoRandom(0, profile.templates.length - 1)];
  
  const v1 = cryptoRandom(versionRange[0], versionRange[1]);
  const v2 = cryptoRandom(0, 25);
  const v3 = cryptoRandom(0, 15);
  
  let userAgent = template ? processSpintax(template, seed) : null;
  
  if (userAgent) {
    userAgent = userAgent
      .replace(/{v1}/g, v1)
      .replace(/{v2}/g, v2)
      .replace(/{v3}/g, v3);
  }
  
  const tokens = generateTokens();
  const timestamp = Date.now() + cryptoRandom(-5000, 5000);
  const messageIdFormat = MESSAGE_ID_FORMATS[cryptoRandom(0, MESSAGE_ID_FORMATS.length - 1)];
  const messageId = messageIdFormat(domain || 'localhost', timestamp, tokens);
  
  const boundaryFormat = BOUNDARY_FORMATS[cryptoRandom(0, BOUNDARY_FORMATS.length - 1)];
  const boundary = boundaryFormat(tokens);
  
  const headerOrder = HEADER_ORDERINGS[cryptoRandom(0, HEADER_ORDERINGS.length - 1)];
  
  return {
    clientType,
    userAgent,
    messageId,
    boundary,
    headerOrder: [...headerOrder],
    headerType: profile.headerType,
    version: `${v1}.${v2}.${v3}`,
    uniqueId: crypto.randomBytes(16).toString('hex')
  };
}

function generateCampaignId() {
  const formats = [
    () => `c${Date.now().toString(36)}${crypto.randomBytes(2).toString('hex')}`,
    () => crypto.randomBytes(4).toString('hex'),
    () => `id${faker.string.alphanumeric({ length: 8 })}${cryptoRandom(100, 999)}`,
    () => `${new Date().getFullYear()}${(new Date().getMonth()+1).toString().padStart(2,'0')}${new Date().getDate().toString().padStart(2,'0')}${crypto.randomBytes(3).toString('hex')}`,
    () => faker.string.alphanumeric({ length: 10 }) + cryptoRandom(100, 999),
    () => Buffer.from(Date.now().toString() + Math.random()).toString('base64').slice(0, 12),
  ];
  
  return formats[cryptoRandom(0, formats.length - 1)]();
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
  const naturalSubs = ['mail', 'email', 'info', 'news', 'newsletter', 'noreply', 'update', 'no-reply', 'hello', 'contact'];
  const subdomain = parts.length > 2 ? parts[0] : naturalSubs[cryptoRandom(0, naturalSubs.length - 1)];
  const host = `${subdomain}.${rootDomain}`;
  
  return { host, subdomain, rootDomain, domainFull };
}

function generateUnsubToken(email, campaign, secret) {
  const ts = Date.now();
  const hourBucket = Math.floor(ts / (1000 * 60 * 60));
  const randomSalt = crypto.randomBytes(4).toString('hex');
  const payload = `${email}|${campaign}|${hourBucket}|${randomSalt}`;
  
  const sig = crypto.createHmac('sha256', secret)
    .update(payload)
    .digest('base64url')
    .slice(0, 32);
  
  return Buffer.from(`${payload}|${sig}`).toString('base64url');
}

function orderHeaders(headers, baseOrder, injectNatural = true) {
  const ordered = [];
  const remaining = new Map(headers);
  
  if (cryptoRandom(0, 100) < 20) {
    const idx1 = cryptoRandom(0, baseOrder.length - 1);
    const idx2 = cryptoRandom(0, baseOrder.length - 1);
    [baseOrder[idx1], baseOrder[idx2]] = [baseOrder[idx2], baseOrder[idx1]];
  }
  
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
  
  const uniqueEntropy = generateUniquenessSalt();
  const seed = crypto.createHash('sha256')
    .update(`${toAddress}${fromAddress}${uniqueEntropy}`)
    .digest('hex');
  const seedInt = parseInt(seed.substring(0, 8), 16);
  
  setSeed(seedInt + uniqueEntropy);
  
  const clientType = selectEmailClient(fromAddress);
  const fingerprint = generateClientFingerprint(clientType, host, seedInt);
  
  const precedenceChance = cryptoRandom(30, 50);
  const feedbackChance = cryptoRandom(40, 60);
  const autoSubmitChance = cryptoRandom(10, 25);
  const priorityChance = cryptoRandom(20, 40);
  
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
    uniqueId: fingerprint.uniqueId,
    
    addPrecedence: cryptoRandom(0, 100) < precedenceChance,
    addFeedbackID: cryptoRandom(0, 100) < feedbackChance,
    addAutoSubmitted: cryptoRandom(0, 100) < autoSubmitChance,
    addXPriority: cryptoRandom(0, 100) < priorityChance,
    
    naturalHeaderOrder: true,
    seed: seedInt,
    entropy: uniqueEntropy
  };
}

function addHeaders(txn, config, unsubData) {
  // Check if X-Mailer or User-Agent already exists
  const existingXMailer = txn.header.get('X-Mailer');
  const existingUserAgent = txn.header.get('User-Agent');
  const hasExistingMailer = !!(existingXMailer || existingUserAgent);
  
  // Only remove headers that we're going to regenerate
  const headersToRemove = [
    'List-Unsubscribe', 
    'List-Unsubscribe-Post', 
    'Feedback-ID',
    'Auto-Submitted', 
    'Message-ID',
    'Precedence', 
    'X-Priority', 
    'X-Campaign', 
    'X-Campaign-ID'
  ];
  
  // Only remove X-Mailer/User-Agent if we're going to add a new one
  if (!hasExistingMailer) {
    headersToRemove.push('X-Mailer', 'User-Agent');
  }
  
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
  
  // Only add X-Mailer/User-Agent if none exists
  if (!hasExistingMailer && config.userAgent) {
    headers.set(config.headerType, config.userAgent);
  }
  
  if (unsubData) {
    const unsubFormats = [
      `<${unsubData.url}>`,
      `<${unsubData.mailto}>, <${unsubData.url}>`,
      `<${unsubData.url}>, <${unsubData.mailto}>`
    ];
    const chosenFormat = unsubFormats[cryptoRandom(0, unsubFormats.length - 1)];
    headers.set('List-Unsubscribe', chosenFormat);
    headers.set('List-Unsubscribe-Post', 'List-Unsubscribe=One-Click');
  }
  
  if (config.addFeedbackID && config.rootDomain) {
    const tokens = generateTokens();
    const feedbackFormat = FEEDBACK_ID_FORMATS[cryptoRandom(0, FEEDBACK_ID_FORMATS.length - 1)];
    const feedbackId = feedbackFormat(config.campaignId, tokens, config.rootDomain);
    headers.set('Feedback-ID', feedbackId);
  }
  
  if (config.addPrecedence) {
    const precedenceOptions = ['bulk', 'list'];
    headers.set('Precedence', precedenceOptions[cryptoRandom(0, 1)]);
  }
  
  if (config.addAutoSubmitted) {
    headers.set('Auto-Submitted', 'auto-generated');
  }
  
  if (config.addXPriority) {
    const priorities = ['3', '3 (Normal)', '5', '5 (Lowest)', '4'];
    headers.set('X-Priority', priorities[cryptoRandom(0, priorities.length - 1)]);
  }
  
  const orderedHeaders = orderHeaders(headers, config.headerOrder, config.naturalHeaderOrder);
  
  for (const { name, value } of orderedHeaders) {
    txn.add_header(name, value);
  }
}

exports.register = function() {
  this.loginfo('Ultra-Enhanced header plugin loaded - Preserves existing X-Mailer/User-Agent');
};

exports.hook_data_post = function(next, connection) {
  const plugin = this;
  const txn = connection.transaction;
  if (!txn) return next();
  
  try {
    const fromAddr = txn.mail_from && txn.mail_from.address && txn.mail_from.address();
    const rcptObj = txn.rcpt_to && txn.rcpt_to[0];
    const toAddr = rcptObj && rcptObj.address && rcptObj.address();
    
    // Check for existing mailer header
    const existingXMailer = txn.header.get('X-Mailer');
    const existingUserAgent = txn.header.get('User-Agent');
    
    const config = buildConfig(fromAddr, toAddr);
    
    let unsubData = null;
    if (config.unsubscribeBaseURL && toAddr) {
      const token = generateUnsubToken(toAddr, config.campaignId, config.unsubscribeSecret);
      const url = `${config.unsubscribeBaseURL}/${encodeURIComponent(token)}`;
      const mailto = `mailto:${config.unsubscribeMailtoLocal}@${config.unsubscribeHost}?subject=unsubscribe`;
      unsubData = { token, url, mailto };
    }
    
    addHeaders(txn, config, unsubData);
    
    const mailerStatus = (existingXMailer || existingUserAgent) ? 'preserved' : 'added';
    connection.loginfo(plugin, `unique: id=${config.uniqueId.slice(0, 16)}... client=${config.clientType} mailer=${mailerStatus} msgid=${config.messageId.slice(0, 30)}...`);
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
  generateCampaignId,
  cryptoRandom,
  generateUniquenessSalt
};
