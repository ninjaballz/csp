'use strict';

const crypto = require('crypto');

/*
  Haraka Email Header Optimization Plugin (Maximum Header Variation)
  ------------------------------------------------------------------
  Features:
  - 10,000+ unique header combinations
  - Massive User-Agent/X-Mailer spintax variations
  - Randomized Message-ID formats
  - Variable MIME boundaries
  - Natural header ordering per client type
  - Japanese market client profiles included
*/

// -------- MASSIVE MAILER SPINTAX (10,000+ combinations) ----------

// Thunderbird variations
const THUNDERBIRD_TEMPLATES = [
  'Mozilla/5.0 ({Windows NT 10.0|Windows NT 6.1|Windows NT 6.3|X11; Linux x86_64|Macintosh; Intel Mac OS X 10.{13|14|15}}; {Win64; x64; |x64; |}rv:{v1}.0) Gecko/{20100101|20110101|20120101} Thunderbird/{v1}.{v2}{|.{v3}}',
  'Mozilla/5.0 ({X11; Linux x86_64|Windows NT 10.0; Win64; x64}; rv:{v1}.0) Gecko/20100101 Thunderbird/{v1}.{v2}',
  'Thunderbird/{v1}.{v2}{|.{v3}} ({Windows|Linux|Mac OS X})',
  'Mozilla Thunderbird {v1}.{v2}{|.{v3}}',
  'Thunderbird {v1}.{v2}{|.{v3}}'
];

// Outlook variations
const OUTLOOK_TEMPLATES = [
  'Microsoft {Outlook|Office Outlook} {14|15|16}.{0|1}.{v2}{|.{v3}}',
  'Outlook {Express |}{14|15|16}.{0|1}.{v2}',
  'Microsoft Outlook {14|15|16}.0 ({v2}{|.{v3}})',
  '{Outlook|Microsoft Outlook|MS Outlook}/{14|15|16}.{0|1}',
  'Microsoft Office {14|15|16}.{0|1}.{v2}'
];

// Apple Mail variations
const APPLE_MAIL_TEMPLATES = [
  'Apple Mail ({14|15|16|17}.{0|1|2|3})',
  'Mail/{14|15|16}.{0|1} ({Mac OS X|macOS} {10.{14|15}|11.{0|1|2}|12.{0|1}})',
  'iOS/{14|15|16|17}.{0|1|2} ({iPhone|iPad}; Mail/{14|15|16}.{0|1})',
  'Darwin Mail ({14|15|16}.{0|1})',
  'Apple Mail {14|15|16}.{0|1}{|.{v3}}'
];

// Gmail variations
const GMAIL_TEMPLATES = [
  null, // Gmail often has no mailer
  null,
  null,
  'GMail{|-Web|-Android}/{1|2}.{v2}',
  'Gmail{| for Android|}/{1|2}.{v2}{|.{v3}}'
];

// Evolution variations
const EVOLUTION_TEMPLATES = [
  'Evolution {3.{38|40|42|44|46}}{|.{v3}}',
  'GNOME Evolution {3.{38|40|42|44}}{|.{v3}}',
  'Evolution Mail/{3.{38|40|42|44}}{|.{v3}}',
  'Evolution/{3.{38|40|42}}.{v3}'
];

// Becky Internet Mail (Japanese)
const BECKY_TEMPLATES = [
  'Becky! {ver.|Internet Mail ver.|}{2.{70|75|80|85|90}}{|.{v3}}',
  'BeckyInternetMail/{2.{70|75|80|85}}{|.{v3}}',
  'Becky! ver.{2.{70|75|80|85|90}}{|.{v3}}'
];

// Other popular clients
const OTHER_MAILER_TEMPLATES = [
  '{Postbox|Mailbird|eM Client|The Bat!|Vivaldi Mail}/{v1}.{v2}{|.{v3}}',
  '{K-9 Mail|BlueMail|Spark|Newton Mail} {for Android|}/{v1}.{v2}',
  '{Roundcube|SquirrelMail|Horde}/{v1}.{v2}{|.{v3}}',
  'Zimbra {Collaboration Suite |}{8|9}.{0|1|2}.{v3}',
  '{Claws Mail|Sylpheed|Alpine|Mutt}/{v1}.{v2}{|.{v3}}',
  '{Windows Live Mail|Windows Mail|Foxmail}/{v1}.{v2}{|.{v3}}',
  '{MailMate|Canary Mail|Superhuman|Hey}/{v1}.{v2}',
  '{ProtonMail|Tutanota|Mailbox.org}/{v1}.{v2}',
  'KMail/{5.{18|19|20}}.{v3}',
  'Geary/{3.{36|38|40}}.{v3}'
];

// -------- MESSAGE-ID FORMAT VARIATIONS (50+ formats) ----------
const MESSAGE_ID_FORMATS = [
  // Standard formats
  (d, ts, r) => `<${r[0]}.${ts}@${d}>`,
  (d, ts, r) => `<${ts}.${r[0]}@${d}>`,
  (d, ts, r) => `<${r[0]}${r[1]}@${d}>`,
  (d, ts, r) => `${r[0]}.${ts}@${d}`,
  (d, ts, r) => `${ts}.${r[0]}@${d}`,
  
  // Hyphenated formats
  (d, ts, r) => `<${r[0]}-${r[1]}-${r[2]}@${d}>`,
  (d, ts, r) => `<${r[0]}-${ts}@${d}>`,
  (d, ts, r) => `${r[0]}-${ts}-${r[3]}@${d}`,
  (d, ts, r) => `<${ts}-${r[0]}-${r[1]}@${d}>`,
  
  // Underscore formats
  (d, ts, r) => `<${r[0]}_${ts}_${r[1]}@${d}>`,
  (d, ts, r) => `${r[0]}_${r[1]}_${ts}@${d}`,
  (d, ts, r) => `<${ts}_${r[0]}@${d}>`,
  
  // Mixed separator formats
  (d, ts, r) => `<${r[0]}.${r[1]}.${r[2]}@${d}>`,
  (d, ts, r) => `${r[0]}$${ts}@${d}`,
  (d, ts, r) => `<${r[0]}$${r[1]}@${d}>`,
  (d, ts, r) => `${r[0]}.${r[1]}@${d}`,
  
  // Prefix formats
  (d, ts, r) => `<msg-${r[0]}-${ts}@${d}>`,
  (d, ts, r) => `<mail.${ts}.${r[0]}@${d}>`,
  (d, ts, r) => `msg${ts}${r[3]}@${d}`,
  (d, ts, r) => `<email-${r[0]}@${d}>`,
  (d, ts, r) => `mail-${ts}-${r[0]}@${d}`,
  
  // Base64 formats
  (d, ts, r) => `<${r[4]}@${d}>`,
  (d, ts, r) => `${r[4]}${r[3]}@${d}`,
  (d, ts, r) => `<${r[4]}.${ts}@${d}>`,
  
  // Short formats
  (d, ts, r) => `<${r[2]}@${d}>`,
  (d, ts, r) => `${r[1]}@${d}`,
  (d, ts, r) => `<${r[1]}.${r[2]}@${d}>`,
  
  // Numeric heavy
  (d, ts, r) => `<${ts}${r[3]}@${d}>`,
  (d, ts, r) => `${r[3]}.${ts}@${d}`,
  (d, ts, r) => `<${r[3]}_${ts}_${r[5]}@${d}>`,
  
  // Gmail-style
  (d, ts, r) => `<${r[0]}.${r[1]}.${r[2]}@mail.gmail.com>`,
  (d, ts, r) => `<${r[4]}.${ts}@mail.gmail.com>`,
  
  // Timestamp variations
  (d, ts, r) => `<${ts}.${r[3]}.${r[0]}@${d}>`,
  (d, ts, r) => `${Date.now().toString(36)}.${r[0]}@${d}`,
  (d, ts, r) => `<${Date.now().toString(36)}${r[2]}@${d}>`,
  
  // Complex formats
  (d, ts, r) => `<${r[0]}.${ts}.${r[1]}.${r[2]}@${d}>`,
  (d, ts, r) => `${r[0]}-${r[1]}-${ts}-${r[3]}@${d}`,
  (d, ts, r) => `<${r[2]}_${r[0]}_${ts}@${d}>`,
  
  // No brackets variations
  (d, ts, r) => `${r[0]}@${d}`,
  (d, ts, r) => `${ts}@${d}`,
  (d, ts, r) => `${r[0]}.${r[1]}@${d}`,
  
  // Special formats
  (d, ts, r) => `<${r[0]}+${r[1]}@${d}>`,
  (d, ts, r) => `${r[0]}=${ts}@${d}`,
  (d, ts, r) => `<${r[0]}~${r[1]}@${d}>`,
  (d, ts, r) => `${r[0]}#${ts}@${d}`,
  
  // Multi-part formats
  (d, ts, r) => `<part.${r[0]}.${ts}@${d}>`,
  (d, ts, r) => `msg.${ts}.${r[3]}.${r[0]}@${d}`,
  (d, ts, r) => `<id.${r[0]}.${r[1]}@${d}>`
];

// -------- MIME BOUNDARY VARIATIONS (30+ styles) ----------
const BOUNDARY_FORMATS = [
  (r) => `------------${r[0]}`,
  (r) => `----=_Part_${r[3]}_${r[0]}`,
  (r) => `----boundary_${r[0]}_${Date.now().toString(36)}`,
  (r) => `----NextPart_${r[0]}_${r[1]}`,
  (r) => `----MIME_${r[0]}`,
  (r) => `----=_NextPart_${r[3]}.${r[0]}`,
  (r) => `----BOUNDARY_${r[0]}`,
  (r) => `----multipart_${r[0]}`,
  (r) => `----MessageBoundary_${r[0]}_${r[1]}`,
  (r) => `----=_Boundary_${r[0]}`,
  (r) => `----=_MixedPart_${r[0]}`,
  (r) => `----_Part_${r[3]}_${r[0]}`,
  (r) => `----=_Alternative_${r[0]}`,
  (r) => `----Apple-Mail-${r[0]}-${r[1]}`,
  (r) => `----Thunderbird-${r[0]}`,
  (r) => `----Outlook-${r[0]}-${r[1]}`,
  (r) => `----WebMail-${r[0]}`,
  (r) => `----=_Related_${r[0]}`,
  (r) => `----MIME_Boundary_${r[0]}`,
  (r) => `----=_PartBoundary_${r[0]}_${r[1]}`,
  (r) => `----EmailBoundary_${r[0]}`,
  (r) => `=-=${r[0]}`,
  (r) => `Apple-Mail=${r[0]}`,
  (r) => `000000000000${r[2]}`,
  (r) => `----==${r[0]}==${r[1]}`,
  (r) => `__boundary__${r[0]}`,
  (r) => `=-boundary-${r[0]}`,
  (r) => `_Part_${r[3]}_${r[0]}`,
  (r) => `NextPart_${r[0]}`,
  (r) => `${r[0]}_${r[1]}_boundary`
];

// -------- FEEDBACK-ID FORMAT VARIATIONS ----------
const FEEDBACK_ID_FORMATS = [
  (c, r, d) => `${c}:${r[0]}:newsletter:${d}`,
  (c, r, d) => `${r[0]}:${c}:mail:${d}`,
  (c, r, d) => `${c}:default:${r[1]}:${d}`,
  (c, r, d) => `campaign:${c}:${r[0]}:${d}`,
  (c, r, d) => `${r[2]}:${c}:news:${d}`,
  (c, r, d) => `${c}:${r[1]}:${r[0]}:${d}`,
  (c, r, d) => `${r[0]}:${r[2]}:campaign:${d}`,
  (c, r, d) => `${c}:m:${r[0]}:${d}`,
  (c, r, d) => `fb:${c}:${r[1]}:${d}`,
  (c, r, d) => `${r[1]}:${c}:${r[0]}:${d}`,
  (c, r, d) => `id:${c}:${r[0]}:${d}`,
  (c, r, d) => `${c}:bulk:${r[0]}:${d}`,
  (c, r, d) => `${r[0]}:news:${c}:${d}`,
  (c, r, d) => `${c}:promo:${r[1]}:${d}`,
  (c, r, d) => `mail:${c}:${r[0]}:${d}`
];

// -------- EMAIL CLIENT PROFILES ----------
const CLIENT_PROFILES = {
  thunderbird: {
    weight: 0.25,
    templates: THUNDERBIRD_TEMPLATES,
    versions: [[78, 102], [91, 115], [68, 91]],
    headerOrder: ['Date', 'From', 'To', 'Subject', 'Message-ID', 'User-Agent', 'MIME-Version', 'Content-Type'],
    headerType: 'User-Agent'
  },
  outlook: {
    weight: 0.30,
    templates: OUTLOOK_TEMPLATES,
    versions: [[14, 16], [15, 19]],
    headerOrder: ['From', 'To', 'Subject', 'Date', 'Message-ID', 'Content-Type', 'X-Mailer', 'MIME-Version'],
    headerType: 'X-Mailer'
  },
  appleMail: {
    weight: 0.15,
    templates: APPLE_MAIL_TEMPLATES,
    versions: [[14, 17], [15, 18]],
    headerOrder: ['From', 'Content-Type', 'Subject', 'Message-ID', 'Date', 'To', 'MIME-Version'],
    headerType: 'X-Mailer'
  },
  gmail: {
    weight: 0.15,
    templates: GMAIL_TEMPLATES,
    versions: [[1, 3]],
    headerOrder: ['MIME-Version', 'From', 'Date', 'Message-ID', 'Subject', 'To', 'Content-Type'],
    headerType: 'X-Mailer'
  },
  evolution: {
    weight: 0.05,
    templates: EVOLUTION_TEMPLATES,
    versions: [[3, 3]],
    headerOrder: ['Date', 'From', 'To', 'Subject', 'Message-ID', 'MIME-Version', 'Content-Type', 'X-Mailer'],
    headerType: 'X-Mailer'
  },
  becky: {
    weight: 0.05,
    templates: BECKY_TEMPLATES,
    versions: [[2, 2]],
    headerOrder: ['Date', 'From', 'To', 'Subject', 'Message-ID', 'X-Mailer', 'MIME-Version', 'Content-Type'],
    headerType: 'X-Mailer'
  },
  other: {
    weight: 0.05,
    templates: OTHER_MAILER_TEMPLATES,
    versions: [[1, 5], [2, 8]],
    headerOrder: ['From', 'To', 'Subject', 'Date', 'Message-ID', 'X-Mailer', 'MIME-Version', 'Content-Type'],
    headerType: 'X-Mailer'
  }
};

// -------- HELPER FUNCTIONS ----------
function randomInt(min, max, seed = null) {
  if (seed !== null) {
    const x = Math.sin(seed) * 10000;
    return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
  }
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(array, seed = null) {
  if (!array || array.length === 0) return null;
  if (seed !== null) {
    const idx = randomInt(0, array.length - 1, seed);
    return array[idx];
  }
  return array[Math.floor(Math.random() * array.length)];
}

function weightedRandom(weights) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  for (const [key, weight] of Object.entries(weights)) {
    if (rand < weight) return key;
    rand -= weight;
  }
  return Object.keys(weights)[0];
}

function getTimeBasedSeed() {
  const now = new Date();
  return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
}

// -------- SPINTAX PROCESSOR FOR HEADERS ----------
function processSpintax(text, seed = null) {
  if (!text || typeof text !== 'string') return text;
  
  let result = text;
  let iterations = 0;
  const maxIterations = 20;
  
  while (result.includes('{') && result.includes('|') && iterations < maxIterations) {
    result = result.replace(/\{([^{}]+)\}/g, (match, content) => {
      const options = content.split('|').map(s => s.trim()).filter(s => s.length > 0);
      if (options.length === 0) return match;
      return randomChoice(options, seed ? seed + iterations : null);
    });
    iterations++;
  }
  
  return result;
}

// -------- SELECT EMAIL CLIENT ----------
function selectEmailClient(fromAddress) {
  const weights = {};
  for (const [key, profile] of Object.entries(CLIENT_PROFILES)) {
    weights[key] = profile.weight;
  }
  
  // Adjust for Japanese domains
  if (fromAddress) {
    const domain = fromAddress.toLowerCase();
    if (domain.includes('.jp') || domain.includes('co.jp') || domain.includes('ne.jp')) {
      weights.becky = (weights.becky || 0.05) * 4;
      weights.thunderbird = (weights.thunderbird || 0.25) * 1.5;
      weights.outlook = (weights.outlook || 0.30) * 1.3;
    }
    
    if (domain.includes('gmail')) {
      weights.gmail = 0.5;
    } else if (domain.includes('outlook') || domain.includes('hotmail')) {
      weights.outlook = 0.6;
    } else if (domain.includes('icloud') || domain.includes('me.com')) {
      weights.appleMail = 0.6;
    }
  }
  
  return weightedRandom(weights);
}

// -------- GENERATE CLIENT FINGERPRINT ----------
function generateClientFingerprint(clientType, domain, seed) {
  const profile = CLIENT_PROFILES[clientType];
  if (!profile) return generateClientFingerprint('thunderbird', domain, seed);
  
  const versionRange = randomChoice(profile.versions, seed);
  const template = randomChoice(profile.templates, seed + 1);
  
  // Generate version numbers
  const v1 = randomInt(versionRange[0], versionRange[1], seed);
  const v2 = randomInt(0, 20, seed + 1);
  const v3 = randomInt(0, 9, seed + 2);
  
  // Process spintax in template
  let userAgent = template ? processSpintax(template, seed + 3) : null;
  
  // Replace version placeholders
  if (userAgent) {
    userAgent = userAgent
      .replace(/{v1}/g, v1)
      .replace(/{v2}/g, v2)
      .replace(/{v3}/g, v3);
  }
  
  // Generate random tokens for Message-ID and boundary
  const r = [
    crypto.randomBytes(8).toString('hex'),
    crypto.randomBytes(6).toString('hex'),
    crypto.randomBytes(4).toString('hex'),
    randomInt(10000, 99999),
    crypto.randomBytes(12).toString('base64url'),
    randomInt(1000, 9999)
  ];
  
  const timestamp = Date.now();
  const messageIdFormat = randomChoice(MESSAGE_ID_FORMATS, seed + 4);
  const messageId = messageIdFormat(domain || 'localhost', timestamp, r);
  
  const boundaryFormat = randomChoice(BOUNDARY_FORMATS, seed + 5);
  const boundary = boundaryFormat(r);
  
  return {
    clientType,
    userAgent,
    messageId,
    boundary,
    headerOrder: [...profile.headerOrder],
    headerType: profile.headerType,
    version: `${v1}.${v2}.${v3}`
  };
}

// -------- GENERATE CAMPAIGN ID ----------
function generateCampaignId(domain, date = new Date()) {
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = crypto.randomBytes(2).toString('hex');
  
  const formats = [
    `nl${year}${month}${day}`,
    `news${month}${day}`,
    `mag${year}${month}`,
    `info${day}${month}`,
    `update${month}${year}`,
    `${year}${month}${day}`,
    `c${randomInt(1000, 9999)}`,
    `campaign${month}${day}`,
    `mail${year}${month}`,
    `${random}${month}`,
    `n${year}${month}`,
    `id${day}${random}`,
    `msg${year}${day}`,
    `e${month}${year}`,
    `camp${random}`
  ];
  
  return randomChoice(formats);
}

// -------- DOMAIN HELPER ----------
function deriveUnsubHost(fromAddress) {
  if (!fromAddress || !fromAddress.includes('@')) {
    return { host: null, subLabel: 'mail', rootDomain: null, domainFull: null };
  }
  
  const domainFull = fromAddress.split('@')[1].toLowerCase();
  const parts = domainFull.split('.').filter(Boolean);

  if (!parts.length) {
    return { host: null, subLabel: 'mail', rootDomain: null, domainFull };
  }

  const rootDomain = parts.slice(-2).join('.');
  const naturalSubs = ['mail', 'email', 'info', 'news', 'newsletter', 'noreply', 'update', 'no-reply', 'notifications', 'alerts'];
  const subLabel = parts.length > 2 ? parts[0] : randomChoice(naturalSubs);
  const host = `${subLabel}.${rootDomain}`;

  return { host, subLabel, rootDomain, domainFull };
}

// -------- GENERATE UNSUBSCRIBE TOKEN ----------
function generateUnsubToken(email, campaign, secret, timestamp = null) {
  const ts = timestamp || Date.now();
  const hourBucket = Math.floor(ts / (1000 * 60 * 60));
  const payload = `${email}|${campaign}|${hourBucket}`;
  
  const sig = crypto.createHmac('sha256', secret)
    .update(payload)
    .digest('base64url')
    .slice(0, 32);
  
  const raw = `${payload}|${sig}`;
  return Buffer.from(raw).toString('base64url');
}

// -------- ORDER HEADERS ----------
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
    
    if (injectNatural) {
      for (const header of remainingArray) {
        const insertPos = randomInt(Math.floor(ordered.length * 0.4), ordered.length);
        ordered.splice(insertPos, 0, header);
      }
    } else {
      ordered.push(...remainingArray);
    }
  }
  
  return ordered;
}

// -------- BUILD CONFIG ----------
function buildConfig(fromAddress) {
  const { host, rootDomain, domainFull } = deriveUnsubHost(fromAddress || '');
  const seed = getTimeBasedSeed();
  const clientType = selectEmailClient(fromAddress);
  const fingerprint = generateClientFingerprint(clientType, host, seed);
  
  return {
    // Unsubscribe
    enableListHeaders: true,
    unsubscribeHost: host,
    unsubscribeBaseURL: host ? `https://${host}/unsubscribe` : null,
    unsubscribeMailtoLocal: 'unsubscribe',
    unsubscribeMethod: 'One-Click',
    unsubscribeSecret: process.env.UNSUB_SECRET || 'CHANGE_THIS_SECRET_KEY',

    // Campaign
    campaignId: generateCampaignId(rootDomain),
    rootDomain,

    // Client fingerprint
    clientType,
    userAgent: fingerprint.userAgent,
    messageId: fingerprint.messageId,
    boundary: fingerprint.boundary,
    headerOrder: fingerprint.headerOrder,
    headerType: fingerprint.headerType,
    
    // Optional header flags
    addPrecedence: Math.random() > 0.6,
    precedenceValue: randomChoice(['bulk', 'list']),
    addFeedbackID: Math.random() > 0.5,
    addAutoSubmitted: Math.random() > 0.85,
    addXPriority: Math.random() > 0.7,
    
    // Anti-detection
    naturalHeaderOrder: true,
    
    seed
  };
}

// -------- ADD HEADERS ----------
function addHeaders(txn, config, unsubData) {
  // Remove old headers
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

  // Essential headers
  headers.set('Message-ID', config.messageId);
  
  if (!txn.header.get('MIME-Version')) {
    headers.set('MIME-Version', '1.0');
  }

  // User-Agent or X-Mailer
  if (config.userAgent) {
    headers.set(config.headerType, config.userAgent);
  }

  // List-Unsubscribe
  if (unsubData) {
    const unsubFormats = [
      `<${unsubData.url}>`,
      `<${unsubData.mailto}>, <${unsubData.url}>`,
      `<${unsubData.url}>, <${unsubData.mailto}>`
    ];
    headers.set('List-Unsubscribe', randomChoice(unsubFormats));
    headers.set('List-Unsubscribe-Post', 'List-Unsubscribe=One-Click');
  }

  // Feedback-ID (random format)
  if (config.addFeedbackID && config.rootDomain) {
    const r = [
      crypto.randomBytes(3).toString('hex'),
      crypto.randomBytes(2).toString('hex'),
      randomInt(1000, 99999)
    ];
    const feedbackFormat = randomChoice(FEEDBACK_ID_FORMATS);
    const feedbackId = feedbackFormat(config.campaignId, r, config.rootDomain);
    headers.set('Feedback-ID', feedbackId);
  }

  // Optional headers
  if (config.addPrecedence) {
    headers.set('Precedence', config.precedenceValue);
  }

  if (config.addAutoSubmitted) {
    headers.set('Auto-Submitted', 'auto-generated');
  }

  if (config.addXPriority) {
    const priorities = ['3', '3 (Normal)', '5', '5 (Lowest)', '4', '4 (Low)', '2', '2 (High)'];
    headers.set('X-Priority', randomChoice(priorities));
  }

  // Order headers naturally
  const orderedHeaders = orderHeaders(headers, config.headerOrder, config.naturalHeaderOrder);

  // Apply headers
  for (const { name, value } of orderedHeaders) {
    txn.add_header(name, value);
  }
}

// -------- PLUGIN HOOKS ----------
exports.register = function () {
  this.loginfo('optimize plugin loaded with 10,000+ header variations');
};

exports.hook_data_post = function (next, connection) {
  const plugin = this;
  const txn = connection.transaction;
  if (!txn) return next();

  try {
    const fromAddr = txn.mail_from && txn.mail_from.address && txn.mail_from.address();
    const config = buildConfig(fromAddr);

    // Generate unsubscribe data
    let unsubData = null;
    if (config.unsubscribeBaseURL) {
      const rcptObj = txn.rcpt_to && txn.rcpt_to[0];
      const rcptEmail = rcptObj && rcptObj.address && rcptObj.address();
      
      if (rcptEmail) {
        const token = generateUnsubToken(rcptEmail, config.campaignId, config.unsubscribeSecret);
        const url = `${config.unsubscribeBaseURL}/${encodeURIComponent(token)}`;
        const mailto = `mailto:${config.unsubscribeMailtoLocal}@${config.unsubscribeHost}?subject=unsubscribe`;
        unsubData = { token, url, mailto };
      }
    }

    // Add headers
    addHeaders(txn, config, unsubData);

    connection.loginfo(plugin, `headers: client=${config.clientType}, msgid=${config.messageId.slice(0, 20)}..., campaign=${config.campaignId}`);
    next();
  } catch (err) {
    connection.logerror(plugin, `optimize error: ${err.message}`);
    next();
  }
};

// -------- EXPORTS ----------
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
