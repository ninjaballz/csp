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
    return { host: null, subdomain: null, rootDomain: null, domainFull: null };
  }

  const domainFull = fromAddress.split('@')[1].toLowerCase();
  const parts = domainFull.split('.').filter(Boolean);

  if (!parts.length) {
    return { host: null, subdomain: null, rootDomain: null, domainFull };
  }

  const rootDomain = parts.slice(-2).join('.');
  
  // Vary subdomain randomly - avoid predictable patterns
  const subStyles = [
    () => randAlpha(cryptoRandom(3, 6)),
    () => `${randAlpha(2)}${randDigits(2)}`,
    () => pick(['m', 'go', 'link', 'click', 'web', 'app', 'api', 'cdn', 'img', 'static']),
    () => parts.length > 2 ? parts[0] : randAlpha(4),
  ];
  
  const subdomain = pick(subStyles)();
  const host = `${subdomain}.${rootDomain}`;
  return { host, subdomain, rootDomain, domainFull };
}

// ---------- Message-ID (procedural; always unique) ----------

function generateMessageId(domain, clientType) {
  const d = domain || 'localhost';
  
  // Randomize format regardless of client type to avoid fingerprinting
  const styles = [
    // UUID-based
    () => `<${crypto.randomUUID()}@${d}>`,
    () => `<${crypto.randomUUID().toUpperCase()}@${d}>`,
    () => `<${crypto.randomUUID().replace(/-/g, '')}@${d}>`,
    
    // Hex-based
    () => `<${randBytesHex(16)}@${d}>`,
    () => `<${randBytesHex(20).toUpperCase()}@${d}>`,
    () => `<${randBytesHex(12)}.${randDigits(8)}@${d}>`,
    
    // AlphaNum mixed
    () => `<${randAlphaNum(cryptoRandom(20, 32))}@${d}>`,
    () => `<${randAlpha(6)}${randDigits(10)}${randAlphaNum(8)}@${d}>`,
    
    // Dotted format
    () => `<${randBytesHex(8)}.${randBytesHex(8)}.${randBytesHex(4)}@${d}>`,
    () => `<${randAlphaNum(8)}.${randAlphaNum(8)}@${d}>`,
    
    // Base64url style
    () => `<${randBase64Url(cryptoRandom(16, 24))}@${d}>`,
  ];
  
  return pick(styles)();
}

// ---------- MIME boundary (procedural; always unique) ----------

function generateBoundary(clientType) {
  // Randomize structure to avoid fingerprinting
  const len = cryptoRandom(20, 40);
  
  const styles = [
    // Generic mixed
    () => `----${randAlphaNum(len)}`,
    () => `${randAlphaNum(8)}${randBytesHex(12)}${randDigits(4)}`,
    () => `_${randAlphaNum(len)}_`,
    () => `----=${randAlphaNum(6)}_${randDigits(10)}.${randBytesHex(6)}`,
    () => `${randBytesHex(cryptoRandom(16, 24))}`,
    () => `--${randAlpha(4)}${randDigits(8)}${randAlphaNum(12)}--`,
    () => `${randAlphaNum(4)}-${randBytesHex(8)}-${randDigits(6)}`,
  ];
  
  return pick(styles)();
}

// ---------- Feedback-ID (procedural; always unique) ----------

function generateFeedbackId(campaignId, rootDomain) {
  // Vary format to avoid pattern detection
  const styles = [
    () => `${randAlphaNum(8)}:${randAlphaNum(6)}:${rootDomain}`,
    () => `${cryptoRandom(100000, 999999)}:${randAlphaNum(10)}`,
    () => `${randBytesHex(6)}-${randBytesHex(4)}`,
    () => `${randAlphaNum(4)}.${randDigits(8)}.${randAlpha(3)}`,
    () => crypto.randomUUID().replace(/-/g, '').slice(0, 20),
  ];
  return pick(styles)();
}

// ---------- Header order (procedural shuffle with soft constraints) ----------

function generateHeaderOrder(headersToAdd, clientType) {
  // Completely randomize order - don't follow client-specific patterns
  const all = [...new Set(headersToAdd.map(h => h.toString()))];
  
  // Fisher-Yates shuffle
  for (let i = all.length - 1; i > 0; i--) {
    const j = cryptoRandom(0, i);
    [all[i], all[j]] = [all[j], all[i]];
  }
  
  return all;
}

// ---------- Client selection and UA/X-Mailer synthesis ----------

function selectEmailClient(fromAddress) {
  // Pure random selection - no domain-based hints that create patterns
  const pool = ['thunderbird', 'outlook', 'appleMail', 'gmail', 'evolution', 'other'];
  return pick(pool);
}

function genSemver(majorRange = [1, 20]) {
  const [minM, maxM] = majorRange;
  const major = cryptoRandom(minM, maxM);
  const minor = cryptoRandom(0, 30);
  const patch = cryptoRandom(0, 20);
  return { major, minor, patch, text: `${major}.${minor}.${patch}` };
}

function genPlatformSnippet() {
  // Small modular pools; no huge static lists
  const osFamilies = ['Windows', 'macOS', 'Linux', 'iOS', 'Android'];
  const fam = pick(osFamilies);

  if (fam === 'Windows') {
    const winVers = ['10.0', '11.0'];
    const archs = ['Win64; x64', 'WOW64'];
    return `Windows NT ${pick(winVers)}; ${pick(archs)}`;
  }

  if (fam === 'macOS') {
    const macVers = ['10_15_7', '11_7', '12_7', '13_6', '14_1'];
    return `Macintosh; Intel Mac OS X ${pick(macVers)}`;
  }

  if (fam === 'Linux') {
    const distros = ['X11; Linux x86_64', 'X11; Ubuntu; Linux x86_64', 'X11; Fedora; Linux x86_64'];
    return pick(distros);
  }

  if (fam === 'iOS') {
    const devices = ['iPhone', 'iPad'];
    const iosVers = ['15_7', '16_7', '17_3'];
    return `iOS/${pick(iosVers)}; ${pick(devices)}`;
  }

  // Android
  const andVers = ['11', '12', '13', '14'];
  return `Android ${pick(andVers)}; Mobile`;
}

function synthesizeUserAgent(clientType) {
  // Realistic but procedurally varied UA/X-Mailer
  const plat = genPlatformSnippet();
  const rv = cryptoRandom(60, 130);
  const gecko = '20100101';
  const v = genSemver([1, 20]);
  const build = `${randDigits(2)}.${randDigits(4)}`;

  if (clientType === 'thunderbird') {
    // Thunderbird 115 "Supernova" / 128 Nebula
    const v = pick(['115.6.0', '115.7.0', '115.8.1', '128.0.1esr']);
    return `Mozilla/5.0 (${plat}; rv:109.0) Gecko/${gecko} Thunderbird/${v}`;
  }

  if (clientType === 'outlook') {
    // Microsoft Outlook 16.0
    const build = cryptoRandom(16000, 17500);
    return `Microsoft Outlook 16.0.${build}.20000`;
  }

  if (clientType === 'appleMail') {
    const variants = [
      `Apple Mail (${v.major}.${v.minor})`,
      `Mail/${v.major}.${v.minor} (macOS)`,
    ];
    return pick(variants);
  }

  if (clientType === 'gmail') {
    const variants = [
      `Gmail/${v.major}.${v.minor}`,
      `Google Mail/${v.major}.${v.minor}`,
      `Gmail API v${v.major}`,
    ];
    return pick(variants);
  }

  if (clientType === 'evolution') {
    return `Evolution ${v.major}.${v.minor}.${v.patch}`;
  }

  // other
  const names = ['MailClient', 'Postbox', 'Mailbird', 'Mailspring', 'K-9 Mail', 'Geary'];
  const name = pick(names);
  return `${name}/${v.text}`;
}

function generateClientFingerprint(clientType, domain) {
  const userAgent = synthesizeUserAgent(clientType);
  const messageId = generateMessageId(domain || 'localhost', clientType);
  const boundary = generateBoundary(clientType);

  // USER REQUEST: "no need the x mailer" -> Removed X-Mailer from order list
  // Determine a randomized order for the headers we might add
  const headerOrderCandidate = generateHeaderOrder([
    'Date',
    'From',
    'To',
    'Subject',
    'Message-ID',
    'MIME-Version',
    'Content-Type',
    'List-Unsubscribe',
    'List-Unsubscribe-Post',
    'Feedback-ID',
    'Precedence',
    'Auto-Submitted',
    'X-Priority',
  ], clientType);

  return {
    clientType,
    userAgent,
    messageId,
    boundary,
    headerOrder: headerOrderCandidate,
    version: randDigits(2) + '.' + randDigits(2) + '.' + randDigits(2), // not used externally but kept for parity
    uniqueId: randBytesHex(16)
  };
}

function generateCampaignId() {
  // Avoid predictable prefix; vary structure
  const styles = [
    () => randAlphaNum(cryptoRandom(12, 18)),
    () => `${randAlpha(2)}${randDigits(6)}${randAlphaNum(4)}`,
    () => crypto.randomUUID().split('-').slice(0, 2).join(''),
    () => randBytesHex(cryptoRandom(6, 10)),
    () => `${randAlpha(1).toUpperCase()}${randDigits(cryptoRandom(8, 12))}`,
  ];
  return pick(styles)();
}

function generateUnsubToken(email, campaign, secret) {
  // Simplified token - just HMAC, no predictable structure
  const randomSalt = randBytesHex(8);
  const payload = `${email}|${campaign}|${randomSalt}`;

  const sig = crypto.createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');

  // Return just the signature - shorter, less pattern
  return sig;
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
  const addFeedbackID = cryptoRandom(0, 100) < cryptoRandom(20, 45); // Reduced frequency
  const addAutoSubmitted = cryptoRandom(0, 100) < cryptoRandom(3, 12); // Very rare
  const addXPriority = cryptoRandom(0, 100) < cryptoRandom(5, 15); // Rare, mostly normal

  // Use env secret if provided, else ephemeral per-process random secret (unique per boot)
  const fallbackSecret = process.env.__UNSUB_FALLBACK_SECRET || (process.env.__UNSUB_FALLBACK_SECRET = randBytesHex(32));
  const unsubscribeSecret = process.env.UNSUB_SECRET || fallbackSecret;

  return {
    enableListHeaders: true,
    unsubscribeHost: host,
    unsubscribeBaseURL: host ? `https://${host}/${pick(['u', 'opt', 'p', 'go', 'm', 's'])}` : null,
    unsubscribeMailtoLocal: pick(['unsubscribe', 'optout', 'remove', 'stop', 'unsub']),
    unsubscribeSecret,

    campaignId: generateCampaignId(),
    rootDomain,

    clientType,
    userAgent: fingerprint.userAgent,
    messageId: fingerprint.messageId,
    boundary: fingerprint.boundary,
    headerOrder: fingerprint.headerOrder,
    uniqueId: fingerprint.uniqueId,

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
  // USER REQUEST: "no need the x mailer" -> Disabled X-Mailer addition
  /*
  if (!hasExistingMailer && config.userAgent) {
    headers.set('X-Mailer', config.userAgent);
  }
  */

  // List-Unsubscribe - vary format and sometimes omit
  if (unsubData && cryptoRandom(0, 100) < 85) { // 85% chance to include
    // Vary format significantly
    const formats = [
      `<${unsubData.url}>`,
      `<${unsubData.mailto}>`,
      `<${unsubData.mailto}>, <${unsubData.url}>`,
      `<${unsubData.url}>, <${unsubData.mailto}>`,
    ];
    headers.set('List-Unsubscribe', pick(formats));
    
    // Only add Post header sometimes (RFC 8058)
    if (cryptoRandom(0, 100) < 60) {
      headers.set('List-Unsubscribe-Post', 'List-Unsubscribe=One-Click');
    }
  }

  // Feedback-ID (unique per message)
  if (config.addFeedbackID && config.rootDomain) {
    headers.set('Feedback-ID', generateFeedbackId(config.campaignId, config.rootDomain));
  }

  // Precedence header - AVOID! It's a spam indicator
  // if (config.addPrecedence) { ... }

  if (config.addAutoSubmitted) {
    headers.set('Auto-Submitted', 'auto-generated');
  }

  if (config.addXPriority) {
    // Mostly use normal priority; avoid low priority spam indicators
    const priorities = ['3', '3'];  // Weight towards normal
    if (cryptoRandom(0, 100) < 10) priorities.push('1', '2'); // Rarely high
    headers.set('X-Priority', pick(priorities));
  }

  const orderedHeaders = orderHeaders(headers, [...config.headerOrder]);

  for (const { name, value } of orderedHeaders) {
    txn.add_header(name, value);
  }
}

// ---------- Haraka plugin exports ----------

exports.register = function() {
  this.loginfo('Ultra-Unique header plugin loaded (pattern-resistant v2)');
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
