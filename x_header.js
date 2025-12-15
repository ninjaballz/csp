'use strict';

const crypto = require('crypto');

/*
  Ultra-Unique Email Header Generator (Algorithmic; no large hardcoded lists)
  --------------------------------------------------------------------------
  - Every message is uniquely fingerprinted using crypto-grade entropy
  - No static template lists (message-id/boundary/order/feedback-id are procedurally generated)
  - Realistic X-Mailer synthesized via small modular grammars
  - Preserves existing X-Mailer/User-Agent if already present
  - Randomized natural header ordering with soft constraints
*/

// ---------- Utilities (crypto-only randomness) ----------

function cryptoRandom(min, max) {
  // Inclusive min/max
  return crypto.randomInt(min, max + 1);
}

function randBytesHex(nBytes) {
  return crypto.randomBytes(nBytes).toString('hex');
}

function randDigits(n) {
  // Generate n digits securely
  let s = '';
  while (s.length < n) s += crypto.randomInt(0, 10);
  return s.slice(0, n);
}

function randAlphaNum(n) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const buf = crypto.randomBytes(n);
  let out = '';
  for (let i = 0; i < n; i++) {
    out += chars[buf[i] % chars.length];
  }
  return out;
}

function randAlpha(n) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const buf = crypto.randomBytes(n);
  let out = '';
  for (let i = 0; i < n; i++) {
    out += chars[buf[i] % chars.length];
  }
  return out;
}

function randBase64Url(nBytes) {
  return crypto.randomBytes(nBytes).toString('base64url');
}

function pick(arr) {
  return arr[cryptoRandom(0, arr.length - 1)];
}

function generateUniquenessSalt() {
  // Per-message uniqueness
  return (
    randBytesHex(16) +
    Date.now().toString(36) +
    randBase64Url(8) +
    process.hrtime.bigint().toString(36)
  );
}

// ---------- Domain helpers ----------

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
  const subdomain = parts.length > 2 ? parts[0] : pick(naturalSubs);
  const host = `${subdomain}.${rootDomain}`;
  return { host, subdomain, rootDomain, domainFull };
}

// ---------- Message-ID (procedural; always unique) ----------

function generateMessageId(domain) {
  const d = domain || 'localhost';
  
  // Timestamp-first approach with various server-like formats
  const formatType = cryptoRandom(0, 3);
  
  if (formatType === 0) {
    // Unix timestamp + UUID-like (no hyphens)
    const ts = Date.now();
    const uuid = randBytesHex(16);
    return `<${ts}${uuid}@${d}>`;
  } else if (formatType === 1) {
    // Base36 timestamp + compact alphanumeric
    const ts = Date.now().toString(36).toUpperCase();
    const rand = randAlphaNum(20);
    return `<${ts}${rand}@${d}>`;
  } else if (formatType === 2) {
    // ISO-like timestamp + base64url
    const now = new Date();
    const ts = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
    const rand = randBase64Url(12);
    return `<${ts}.${rand}@${d}>`;
  } else {
    // Hex timestamp + double hex string (no delimiters)
    const ts = Date.now().toString(16);
    const r1 = randBytesHex(6);
    const r2 = randBytesHex(10);
    return `<${ts}${r1}${r2}@${d}>`;
  }
}

// ---------- MIME boundary (procedural; always unique) ----------

function generateBoundary() {
  // Wide variety of MIME boundary styles, avoiding standard patterns
  const styleType = cryptoRandom(0, 4);
  
  if (styleType === 0) {
    // Underscore-heavy style
    const parts = [randAlphaNum(8), randAlphaNum(12), randBytesHex(8)];
    return parts.join('_');
  } else if (styleType === 1) {
    // Dot-separated alphanumeric
    const parts = [randAlphaNum(6), randAlphaNum(10), randAlphaNum(8)];
    return parts.join('.');
  } else if (styleType === 2) {
    // Pure alphanumeric (no delimiters)
    return randAlphaNum(32);
  } else if (styleType === 3) {
    // Mixed with equals and underscores
    const core = randBase64Url(20);
    return `${randAlpha(4)}_${core}_${randAlphaNum(6)}`;
  } else {
    // Double dash prefix with base64url
    const core = randBase64Url(24);
    return `--${core}`;
  }
}

// ---------- Feedback-ID (procedural; always unique) ----------

function generateFeedbackId(campaignId, rootDomain) {
  // Changed separators and format components
  const formatType = cryptoRandom(0, 2);
  
  if (formatType === 0) {
    // Pipe-separated with different scopes
    const scopes = ['msg', 'stream', 'batch', 'send', 'delivery', 'dispatch'];
    const scope = pick(scopes);
    const token = randBase64Url(8);
    const c = `${campaignId}.${randAlphaNum(4)}`;
    return `${scope}|${c}|${token}|${rootDomain}`;
  } else if (formatType === 1) {
    // Slash-separated with numeric prefix
    const prefix = randDigits(5);
    const token = randBytesHex(6);
    return `${prefix}/${campaignId}/${token}/${rootDomain}`;
  } else {
    // Dot-separated with timestamp
    const ts = Date.now().toString(36);
    const token = randAlphaNum(8);
    return `${campaignId}.${ts}.${token}.${rootDomain}`;
  }
}

// ---------- Header order (procedural shuffle with soft constraints) ----------

function generateHeaderOrder(headersToAdd) {
  // New shuffling: don't always pin Date/From/To/Subject to top
  const base = Array.from(new Set(headersToAdd.map(h => h.toString())));
  
  // Shuffle function
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = cryptoRandom(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Different grouping strategy: sometimes group differently
  const groupType = cryptoRandom(0, 2);
  
  if (groupType === 0) {
    // Full shuffle - no constraints
    shuffle(base);
    return base;
  } else if (groupType === 1) {
    // Group MIME headers together, shuffle rest
    const mimeHeaders = base.filter(h => ['MIME-Version', 'Content-Type'].includes(h));
    const remainder = base.filter(h => !mimeHeaders.includes(h));
    shuffle(remainder);
    const insertPos = cryptoRandom(0, remainder.length);
    return [...remainder.slice(0, insertPos), ...mimeHeaders, ...remainder.slice(insertPos)];
  } else {
    // Put Subject/Message-ID near end sometimes
    const endHeaders = base.filter(h => ['Subject', 'Message-ID'].includes(h));
    const remainder = base.filter(h => !endHeaders.includes(h));
    shuffle(remainder);
    shuffle(endHeaders);
    return [...remainder, ...endHeaders];
  }
}

// ---------- Client selection and UA/X-Mailer synthesis ----------

function selectEmailClient(fromAddress) {
  // Updated client pools and weighting logic
  const f = (fromAddress || '').toLowerCase();

  const pool = ['thunderbird', 'outlook', 'appleMail', 'gmail', 'mailspring', 'spark', 'other'];
  let weight = {
    thunderbird: 8,
    outlook: 15,
    appleMail: 10,
    gmail: 9,
    mailspring: 5,
    spark: 6,
    other: 7,
  };

  // Adjusted domain hints with different logic
  if (f.includes('gmail')) weight.gmail += cryptoRandom(5, 9);
  if (f.includes('outlook') || f.includes('hotmail') || f.includes('office')) weight.outlook += cryptoRandom(4, 8);
  if (f.includes('icloud') || f.includes('me.com') || f.endsWith('.mac.com')) {
    weight.appleMail += cryptoRandom(5, 10);
    weight.spark += cryptoRandom(2, 5);
  }
  if (f.endsWith('.jp') || f.includes('.co.jp')) {
    weight.thunderbird += cryptoRandom(3, 7);
    weight.other += cryptoRandom(2, 4);
  }

  // Different noise pattern
  for (const k of Object.keys(weight)) {
    weight[k] = Math.max(1, Math.floor(weight[k] * (cryptoRandom(70, 130) / 100)));
  }

  const total = Object.values(weight).reduce((a, b) => a + b, 0);
  let r = cryptoRandom(1, total);
  for (const k of pool) {
    r -= weight[k];
    if (r <= 0) return k;
  }
  return 'outlook';
}

function genSemver(majorRange = [1, 20]) {
  const [minM, maxM] = majorRange;
  const major = cryptoRandom(minM, maxM);
  const minor = cryptoRandom(0, 30);
  const patch = cryptoRandom(0, 20);
  return { major, minor, patch, text: `${major}.${minor}.${patch}` };
}

function genPlatformSnippet() {
  // Updated with modern OS versions
  const osFamilies = ['Windows', 'macOS', 'Linux', 'iOS', 'Android'];
  const fam = pick(osFamilies);

  if (fam === 'Windows') {
    const winVers = ['11.0', '11.0', '10.0']; // Favor Windows 11
    const archs = ['Win64; x64', 'ARM64'];
    return `Windows NT ${pick(winVers)}; ${pick(archs)}`;
  }

  if (fam === 'macOS') {
    const macVers = ['14_2', '14_3', '14_4', '15_0', '15_1', '13_6'];
    return `Macintosh; Intel Mac OS X ${pick(macVers)}`;
  }

  if (fam === 'Linux') {
    const distros = ['X11; Linux x86_64', 'X11; Ubuntu; Linux x86_64', 'X11; Arch Linux; x86_64', 'X11; Debian; Linux x86_64'];
    return pick(distros);
  }

  if (fam === 'iOS') {
    const devices = ['iPhone', 'iPad'];
    const iosVers = ['17_2', '17_3', '17_4', '18_0'];
    return `iOS/${pick(iosVers)}; ${pick(devices)}`;
  }

  // Android
  const andVers = ['13', '14', '15'];
  return `Android ${pick(andVers)}; Mobile`;
}

function synthesizeUserAgent(clientType) {
  // Updated client versions and variations
  const plat = genPlatformSnippet();
  const rv = cryptoRandom(115, 135); // Modern Firefox versions
  const gecko = '20100101';
  const v = genSemver([10, 25]); // Higher version numbers
  const build = `${randDigits(3)}.${randDigits(5)}`;

  if (clientType === 'thunderbird') {
    // Modern Mozilla-style UA
    return `Mozilla/5.0 (${plat}; rv:${rv}.0) Gecko/${gecko} Thunderbird/${v.major + 100}.${v.minor}.${v.patch}`;
  }

  if (clientType === 'outlook') {
    // Modern Outlook versions
    const variants = [
      `Microsoft Outlook ${v.major + 10}.0 (${build})`,
      `Outlook-Desktop/${v.major + 10}.${v.minor}.${v.patch}`,
      `Microsoft Office Outlook ${v.major + 10}`,
    ];
    return pick(variants);
  }

  if (clientType === 'appleMail') {
    const variants = [
      `Apple Mail (${v.major + 10}.${v.minor})`,
      `Mail/${v.major + 10}.${v.minor} (macOS)`,
      `AppleMail/${v.major + 10}.${v.minor}.${v.patch}`,
    ];
    return pick(variants);
  }

  if (clientType === 'gmail') {
    const variants = [
      `Gmail/${v.major + 20}.${v.minor}`,
      `Google Mail/${v.major + 20}.${v.minor}`,
      `Gmail API v${v.major}`,
      `Gmail-Client/${v.major + 20}.${v.minor}.${v.patch}`,
    ];
    return pick(variants);
  }

  if (clientType === 'mailspring') {
    return `Mailspring ${v.major}.${v.minor}.${v.patch}`;
  }

  if (clientType === 'spark') {
    return `Spark ${v.major}.${v.minor}.${v.patch}`;
  }

  // other
  const names = ['ProtonMail', 'Fastmail', 'Mailbird', 'Canary Mail', 'eM Client', 'BlueMail'];
  const name = pick(names);
  return `${name}/${v.text}`;
}

function generateClientFingerprint(clientType, domain) {
  const userAgent = synthesizeUserAgent(clientType);
  const messageId = generateMessageId(domain || 'localhost');
  const boundary = generateBoundary();

  // Always use X-Mailer; never synthesize 'User-Agent' for email
  const headerType = 'X-Mailer';

  // Determine a randomized order for the headers we might add
  const headerOrderCandidate = generateHeaderOrder([
    'Date',
    'From',
    'To',
    'Subject',
    'Message-ID',
    headerType,
    'MIME-Version',
    'Content-Type',
    'List-Unsubscribe',
    'List-Unsubscribe-Post',
    'Feedback-ID',
    'Precedence',
    'Auto-Submitted',
    'X-Priority',
  ]);

  return {
    clientType,
    userAgent,
    messageId,
    boundary,
    headerOrder: headerOrderCandidate,
    headerType,
    version: randDigits(2) + '.' + randDigits(2) + '.' + randDigits(2), // not used externally but kept for parity
    uniqueId: randBytesHex(16)
  };
}

function generateCampaignId() {
  // Changed prefix and generation pattern
  const formatType = cryptoRandom(0, 2);
  
  if (formatType === 0) {
    // Hex timestamp with alphanumeric suffix
    const ts = Date.now().toString(16);
    const suffix = randAlphaNum(10);
    return `${ts}${suffix}`;
  } else if (formatType === 1) {
    // Base64url prefix with hex
    const prefix = randBase64Url(4);
    const mid = Date.now().toString(36);
    const suffix = randBytesHex(4);
    return `${prefix}_${mid}_${suffix}`;
  } else {
    // Pure alphanumeric with timestamp
    const ts = Date.now().toString(36);
    const pre = randAlphaNum(4);
    const post = randAlphaNum(8);
    return `${pre}${ts}${post}`;
  }
}

function generateUnsubToken(email, campaign, secret) {
  const ts = Date.now();
  const hourBucket = Math.floor(ts / (1000 * 60 * 60));
  const randomSalt = randBytesHex(4);
  const payload = `${email}|${campaign}|${hourBucket}|${randomSalt}`;

  const sig = crypto.createHmac('sha256', secret)
    .update(payload)
    .digest('base64url')
    .slice(0, 32);

  return Buffer.from(`${payload}|${sig}`).toString('base64url');
}

function orderHeaders(headers, baseOrder) {
  // Order headers by our procedurally generated order; keep any extras at the end
  const ordered = [];
  const remaining = new Map(headers);

  // With small probability, swap two in baseOrder to add more entropy
  if (cryptoRandom(0, 100) < 25 && baseOrder.length > 1) {
    const idx1 = cryptoRandom(0, baseOrder.length - 1);
    let idx2 = cryptoRandom(0, baseOrder.length - 1);
    if (idx1 === idx2) idx2 = (idx2 + 1) % baseOrder.length;
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
    // Preserve random order for remaining
    const remArr = Array.from(remaining).map(([name, value]) => ({ name, value }));
    for (let i = remArr.length - 1; i > 0; i--) {
      const j = cryptoRandom(0, i);
      [remArr[i], remArr[j]] = [remArr[j], remArr[i]];
    }
    ordered.push(...remArr);
  }

  return ordered;
}

function buildConfig(fromAddress, toAddress) {
  const { host, rootDomain } = deriveUnsubHost(fromAddress || '');

  // Choose client per message with noise
  const clientType = selectEmailClient(fromAddress);
  const fingerprint = generateClientFingerprint(clientType, host);

  // Only randomized chances; no constants
  const addPrecedence = cryptoRandom(0, 100) < cryptoRandom(25, 55);
  const addFeedbackID = cryptoRandom(0, 100) < cryptoRandom(40, 70);
  const addAutoSubmitted = cryptoRandom(0, 100) < cryptoRandom(5, 30);
  const addXPriority = cryptoRandom(0, 100) < cryptoRandom(15, 45);

  // Use env secret if provided, else ephemeral per-process random secret (unique per boot)
  const fallbackSecret = process.env.__UNSUB_FALLBACK_SECRET || (process.env.__UNSUB_FALLBACK_SECRET = randBytesHex(32));
  const unsubscribeSecret = process.env.UNSUB_SECRET || fallbackSecret;

  return {
    enableListHeaders: true,
    unsubscribeHost: host,
    unsubscribeBaseURL: host ? `https://${host}/unsubscribe` : null,
    unsubscribeMailtoLocal: 'unsubscribe',
    unsubscribeSecret,

    campaignId: generateCampaignId(),
    rootDomain,

    clientType,
    userAgent: fingerprint.userAgent,
    messageId: fingerprint.messageId,
    boundary: fingerprint.boundary,
    headerOrder: fingerprint.headerOrder,
    headerType: fingerprint.headerType,
    uniqueId: fingerprint.uniqueId,

    addPrecedence,
    addFeedbackID,
    addAutoSubmitted,
    addXPriority,
  };
}

function addHeaders(txn, config, unsubData) {
  // Preserve existing X-Mailer/User-Agent
  const existingXMailer = txn.header.get('X-Mailer');
  const existingUserAgent = txn.header.get('User-Agent');
  const hasExistingMailer = !!(existingXMailer || existingUserAgent);

  // Remove only headers we will regenerate
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

  if (!hasExistingMailer) {
    headersToRemove.push('X-Mailer', 'User-Agent');
  }

  headersToRemove.forEach(h => {
    const all = (txn.header.get_all && txn.header.get_all(h)) || [];
    if (Array.isArray(all)) {
      while (txn.header.get_all(h).length) {
        txn.remove_header(h);
      }
    } else if (txn.header.get && txn.header.get(h)) {
      txn.remove_header(h);
    }
  });

  const headers = new Map();

  // Message-ID always unique
  headers.set('Message-ID', config.messageId);

  // MIME-Version if missing
  if (!txn.header.get('MIME-Version')) {
    headers.set('MIME-Version', '1.0');
  }

  // Only add X-Mailer if none exist (never add 'User-Agent')
  if (!hasExistingMailer && config.userAgent) {
    headers.set('X-Mailer', config.userAgent);
  }

  // List-Unsubscribe
  if (unsubData) {
    // Minor format variations to add uniqueness
    const formats = [
      `<${unsubData.url}>`,
      `<${unsubData.mailto}>, <${unsubData.url}>`,
      `<${unsubData.url}>, <${unsubData.mailto}>`
    ];
    headers.set('List-Unsubscribe', pick(formats));
    headers.set('List-Unsubscribe-Post', 'List-Unsubscribe=One-Click');
  }

  // Feedback-ID (unique per message)
  if (config.addFeedbackID && config.rootDomain) {
    headers.set('Feedback-ID', generateFeedbackId(config.campaignId, config.rootDomain));
  }

  if (config.addPrecedence) {
    headers.set('Precedence', pick(['bulk', 'list']));
  }

  if (config.addAutoSubmitted) {
    headers.set('Auto-Submitted', 'auto-generated');
  }

  if (config.addXPriority) {
    headers.set('X-Priority', pick(['3', '3 (Normal)', '4', '5', '5 (Lowest)']));
  }

  const orderedHeaders = orderHeaders(headers, [...config.headerOrder]);

  for (const { name, value } of orderedHeaders) {
    txn.add_header(name, value);
  }
}

// ---------- Haraka plugin exports ----------

exports.register = function() {
  this.loginfo('Ultra-Unique header plugin loaded (algorithmic; preserves existing; adds X-Mailer only, never User-Agent)');
};

exports.hook_data_post = function(next, connection) {
  const plugin = this;
  const txn = connection.transaction;
  if (!txn) return next();

  try {
    const fromAddr = txn.mail_from && txn.mail_from.address && txn.mail_from.address();
    const rcptObj = txn.rcpt_to && txn.rcpt_to[0];
    const toAddr = rcptObj && rcptObj.address && rcptObj.address();

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
    connection.loginfo(
      plugin,
      `unique: id=${config.uniqueId.slice(0, 16)}... client=${config.clientType} mailer=${mailerStatus} msgid=${config.messageId.slice(0, 30)}...`
    );
    next();
  } catch (err) {
    connection.logerror(plugin, `error: ${err.message}`);
    next();
  }
};

// ---------- Internal (for tests) ----------

exports._internal = {
  deriveUnsubHost,
  generateUnsubToken,
  buildConfig,
  selectEmailClient,
  generateClientFingerprint,
  generateMessageId,
  generateBoundary,
  generateFeedbackId,
  generateCampaignId,
  orderHeaders,
  cryptoRandom,
  generateUniquenessSalt
};
