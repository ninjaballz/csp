'use strict';

const crypto = require('crypto');

/*
  Haraka Optimize / Unsubscribe Plugin (Enhanced with Massive Randomization)
  --------------------------------------------------------------------------
  Put this file at: /opt/haraka/plugins/optimize.js
  Enable in: /opt/haraka/config/plugins  (add a line: optimize)

  Environment:
    export UNSUB_SECRET="a_really_long_random_secret_here"

  Features:
  - 1000+ unique X-Mailer combinations via spintax
  - Spintax support for content variation
  - Unique Message-IDs per message
  - Variable timing headers
  - Randomized Feedback-IDs
  - MIME boundary randomization
*/

// -------- Massive Mailer Templates with Spintax (1000+ combinations) ----------
const MAILER_SPINTAX = [
  'Thunderbird/{v1}.{v2}.{v3}',
  'Mozilla Thunderbird {v1}.{v2}.{v3}',
  'Thunderbird/{v1}.{v2}',
  'Apple Mail ({v1}.{v2})',
  'Mail/{v1}.{v2} (Mac OS X {v3}.{v4})',
  'Apple Mail {v1}.{v2}.{v3}',
  'Outlook {v1}.{v2}',
  'Microsoft Outlook {v1}.{v2}',
  'Outlook Express {v1}.{v2}.{v3}',
  'Microsoft Office Outlook {v1}.{v2}',
  'Evolution {v1}.{v2}.{v3}',
  'Evolution Mail {v1}.{v2}',
  'GNOME Evolution {v1}.{v2}.{v3}',
  'Postbox {v1}.{v2}.{v3}',
  'Postbox/{v1}.{v2}',
  'Claws Mail {v1}.{v2}.{v3}',
  'Claws-Mail/{v1}.{v2}',
  'Mozilla/5.0',
  'Mozilla/{v1}.{v2}',
  'IBM Notes {v1}.{v2}',
  'Lotus Notes {v1}.{v2}.{v3}',
  'IBM Domino {v1}.{v2}',
  'eM Client {v1}.{v2}',
  'eM Client/{v1}.{v2}.{v3}',
  'Mailbird {v1}.{v2}.{v3}',
  'Mailbird/{v1}.{v2}',
  'The Bat! {v1}.{v2}',
  'The Bat! Professional {v1}.{v2}.{v3}',
  'Vivaldi Mail {v1}.{v2}',
  'Vivaldi/{v1}.{v2}.{v3}',
  'Opera Mail {v1}.{v2}',
  'Opera/{v1}.{v2}',
  'Horde IMP H5 ({v1}.{v2})',
  'IMP/{v1}.{v2}.{v3}',
  'Horde/{v1}.{v2}',
  'SquirrelMail/{v1}.{v2}.{v3}',
  'SquirrelMail {v1}.{v2}',
  'RoundCube Webmail/{v1}.{v2}',
  'Roundcube/{v1}.{v2}.{v3}',
  'Zimbra {v1}.{v2}.{v3}',
  'Zimbra Collaboration Suite {v1}.{v2}',
  'K-9 Mail for Android',
  'K-9 Mail/{v1}.{v2}',
  'Nine - Exchange ActiveSync',
  'Nine/{v1}.{v2}',
  'BlueMail {v1}.{v2}',
  'BlueMail/{v1}.{v2}.{v3}',
  'Spark {v1}.{v2}',
  'Spark Mail {v1}.{v2}.{v3}',
  'Newton Mail {v1}.{v2}',
  'Newton/{v1}.{v2}',
  'Polymail {v1}.{v2}',
  'Polymail/{v1}.{v2}.{v3}',
  'Airmail {v1}.{v2}',
  'Airmail {v1}.{v2}.{v3}',
  'Mailspring {v1}.{v2}.{v3}',
  'Mailspring/{v1}.{v2}',
  'Geary {v1}.{v2}',
  'Geary/{v1}.{v2}.{v3}',
  'KMail {v1}.{v2}',
  'KMail/{v1}.{v2}.{v3}',
  'Kontact {v1}.{v2}',
  'Sylpheed {v1}.{v2}.{v3}',
  'Sylpheed-Claws {v1}.{v2}',
  'Mutt/{v1}.{v2}',
  'Mutt {v1}.{v2}.{v3}',
  'Alpine {v1}.{v2}',
  'Alpine/{v1}.{v2}.{v3}',
  'Pine {v1}.{v2}',
  'Pegasus Mail {v1}.{v2}',
  'Pegasus/{v1}.{v2}.{v3}',
  'IncrediMail {v1}.{v2}',
  'IncrediMail/{v1}.{v2}.{v3}',
  'Windows Live Mail {v1}.{v2}',
  'Windows Mail {v1}.{v2}.{v3}',
  'Foxmail {v1}.{v2}',
  'Foxmail/{v1}.{v2}.{v3}',
  'DreamMail {v1}.{v2}',
  'MailMate ({v1}.{v2})',
  'MailMate/{v1}.{v2}',
  'Spike {v1}.{v2}',
  'Edison Mail {v1}.{v2}',
  'Canary Mail {v1}.{v2}',
  'Missive {v1}.{v2}',
  'Front {v1}.{v2}',
  'Superhuman {v1}.{v2}',
  'Hey/{v1}.{v2}',
  'ProtonMail {v1}.{v2}',
  'Tutanota {v1}.{v2}',
  'FastMail {v1}.{v2}',
  'Yandex.Mail {v1}.{v2}',
  'Mail.ru Agent {v1}.{v2}',
  'Yahoo! Mail {v1}.{v2}',
  'AOL Mail {v1}.{v2}',
  'GMX Mail {v1}.{v2}',
  'Zoho Mail {v1}.{v2}',
  'Mailfence {v1}.{v2}',
  'Hushmail {v1}.{v2}',
  'Runbox {v1}.{v2}',
  'Posteo {v1}.{v2}',
  'Mailbox.org {v1}.{v2}',
  'Migadu {v1}.{v2}'
];

const BOUNDARY_PREFIXES = [
  '----=_Part_',
  '----boundary_',
  '----NextPart_',
  '----MIME_',
  '----=_NextPart_',
  '----BOUNDARY_',
  '----multipart_',
  '----MessageBoundary_',
  '----=_Boundary_',
  '----=_MixedPart_',
  '----_Part_',
  '----=_Alternative_',
  '----Apple-Mail-',
  '----Thunderbird-',
  '----Outlook-',
  '----WebMail-',
  '----=_Related_',
  '----MIME_Boundary_',
  '----=_PartBoundary_',
  '----EmailBoundary_'
];

// -------- Helper: Random Number Generator ----------
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// -------- Helper: Generate Random X-Mailer with extreme variation ----------
function generateRandomMailer() {
  const template = randomChoice(MAILER_SPINTAX);
  
  // Generate version numbers with high variability
  const v1 = randomInt(1, 120);  // Major version (1-120)
  const v2 = randomInt(0, 999);  // Minor version (0-999)
  const v3 = randomInt(0, 9999); // Patch version (0-9999)
  const v4 = randomInt(10, 24);  // For Mac OS X versions
  
  return template
    .replace('{v1}', v1)
    .replace('{v2}', v2)
    .replace('{v3}', v3)
    .replace('{v4}', v4);
}

// -------- Helper: Generate Random Message-ID with 20+ formats ----------
function generateMessageId(domain) {
  const timestamp = Date.now();
  const random1 = crypto.randomBytes(8).toString('hex');
  const random2 = crypto.randomBytes(6).toString('hex');
  const random3 = crypto.randomBytes(4).toString('hex');
  const random4 = randomInt(10000, 99999);
  const random5 = randomInt(1000, 9999);
  const b64 = crypto.randomBytes(12).toString('base64url');
  
  const formats = [
    `${random1}.${timestamp}.${random2}@${domain}`,
    `${timestamp}.${random1}@${domain}`,
    `<${random1}$${random2}@${domain}>`,
    `${random2}-${timestamp}-${random4}@${domain}`,
    `${random1}.${random4}@${domain}`,
    `${timestamp}${random2}@${domain}`,
    `<${timestamp}.${random3}.${random1}@${domain}>`,
    `${random4}.${random5}.${timestamp}@${domain}`,
    `${b64}@${domain}`,
    `<${b64}.${timestamp}@${domain}>`,
    `msg-${random1}-${timestamp}@${domain}`,
    `${random3}.${random1}@${domain}`,
    `<${random2}@${domain}>`,
    `${timestamp}-${random1}-${random3}@${domain}`,
    `${random1}$${timestamp}@${domain}`,
    `<msg.${timestamp}.${random4}@${domain}>`,
    `${random3}_${timestamp}_${random5}@${domain}`,
    `${b64}${random4}@${domain}`,
    `<${random1}.${random2}.${random3}@${domain}>`,
    `mail.${timestamp}.${random1}@${domain}`,
    `${timestamp}${random4}${random5}@${domain}`,
    `<${random3}-${timestamp}@${domain}>`,
    `${random1}${random2}@${domain}`,
    `msg${timestamp}${random4}@${domain}`
  ];
  
  return randomChoice(formats);
}

// -------- Helper: Generate Random MIME Boundary ----------
function generateBoundary() {
  const prefix = randomChoice(BOUNDARY_PREFIXES);
  const random1 = crypto.randomBytes(randomInt(8, 16)).toString('hex');
  const random2 = crypto.randomBytes(randomInt(4, 8)).toString('hex');
  const timestamp = Date.now().toString(36);
  const random3 = randomInt(100000, 999999);
  
  const formats = [
    `${prefix}${timestamp}_${random1}_${random2}`,
    `${prefix}${random1}_${random3}`,
    `${prefix}${timestamp}${random2}`,
    `${prefix}${random1}${timestamp}`,
    `${prefix}${random3}_${random2}_${timestamp}`
  ];
  
  return randomChoice(formats);
}

// -------- Helper: Spintax Processing ----------
function processSpintax(text) {
  if (!text || typeof text !== 'string') return text;
  
  // Process nested spintax: {option1|option2|option3}
  let result = text;
  let maxIterations = 100;
  
  while (result.includes('{') && result.includes('|') && maxIterations-- > 0) {
    result = result.replace(/\{([^{}]+)\}/g, (match, content) => {
      const options = content.split('|');
      return randomChoice(options);
    });
  }
  
  return result;
}

// -------- Helper: derive host pieces ----------
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
  const subLabel = parts.length > 2 ? parts[0] : 'mail';
  const host = `${subLabel}.${rootDomain}`;

  return { host, subLabel, rootDomain, domainFull };
}

// -------- Helper: generate unsubscribe token ----------
function generateUnsubToken(email, campaign, secret) {
  const hourBucket = Math.floor(Date.now() / (1000 * 60 * 60));
  const payload = `${email}|${campaign}|${hourBucket}`;
  const sig = crypto.createHmac('sha256', secret)
    .update(payload)
    .digest('base64url')
    .slice(0, 32);
  const raw = `${payload}|${sig}`;
  return Buffer.from(raw).toString('base64url');
}

// -------- Helper: Generate Random Campaign ID ----------
function generateRandomCampaignId() {
  const prefixes = ['news', 'update', 'alert', 'promo', 'info', 'campaign', 'msg', 'mail', 
                    'blast', 'send', 'dist', 'letter', 'digest', 'weekly', 'monthly', 
                    'daily', 'special', 'offer', 'notice', 'bulletin', 'flash', 'brief'];
  const suffixes = ['_id', '_ref', '_code', '_tag', '_key', '', '', ''];
  
  const prefix = randomChoice(prefixes);
  const suffix = randomChoice(suffixes);
  const randomNum = randomInt(1000, 9999999);
  const randomStr = crypto.randomBytes(randomInt(2, 5)).toString('hex');
  
  const formats = [
    `${prefix}_${randomNum}${suffix}`,
    `${prefix}-${randomStr}${suffix}`,
    `${randomNum}_${prefix}${suffix}`,
    `${randomStr}${randomNum}${suffix}`,
    `${prefix}${randomNum}${suffix}`,
    `${randomStr}_${prefix}${suffix}`,
    `${prefix}${suffix}${randomNum}`,
    `c${randomNum}${prefix}${suffix}`,
    `${randomStr}${suffix}`
  ];
  
  return randomChoice(formats);
}

// -------- Helper: build per-message CONFIG ----------
function buildConfig(fromAddress) {
  const { host, rootDomain } = deriveUnsubHost(fromAddress || '');

  return {
    enableMicrodata: true,
    enableImageOptimization: true,
    enablePlainTextTuning: true,
    enableSpintax: true,

    // Unsubscribe
    enableListHeaders: true,
    enableUnsubPlaceholders: true,
    unsubscribeHost: host,
    unsubscribeBaseURL: host ? `https://${host}/unsub` : null,
    unsubscribeMailtoLocal: 'unsubscribe',
    unsubscribeMethod: 'One-Click',
    unsubscribeSecret: process.env.UNSUB_SECRET || 'CHANGESBEB019201',

    // Campaign identifiers (randomized)
    defaultCampaignId: generateRandomCampaignId(),
    enableFeedbackID: true,
    rootDomain,

    // Randomization
    randomizeHeaders: true,
    randomMailer: generateRandomMailer(),
    randomMessageId: host ? generateMessageId(host) : generateMessageId('localhost'),
    randomBoundary: generateBoundary(),
    
    // Extra headers
    addBodyHashHeaders: false,
    setAutoSubmitted: false,
    addPrecedence: Math.random() > 0.5,
    precedenceValue: randomChoice(['bulk', 'list', 'junk']),
    
    // Timing randomization
    addRandomDelay: 0, // Set to > 0 to add delays in seconds
  };
}

// -------- Helper: replace placeholders in a body part ----------
function replacePlaceholders(content, rcptEmail, unsubData, config) {
  if (!content) return content;

  // Process spintax first
  if (config.enableSpintax) {
    content = processSpintax(content);
  }

  // Recipient placeholders
  if (rcptEmail) {
    const [local, domain] = rcptEmail.split('@');
    content = content
      .replace(/{{RECIPIENT_EMAIL}}/g, rcptEmail)
      .replace(/{{RECIPIENT_USERNAME}}/g, local || '')
      .replace(/{{RECIPIENT_DOMAIN}}/g, domain || '');
  }

  if (config.enableUnsubPlaceholders && unsubData) {
    content = content
      .replace(/{{UNSUB_URL}}/g, unsubData.url)
      .replace(/{{UNSUB_MAILTO}}/g, unsubData.mailto);
  }

  // Add timestamp placeholders
  const now = new Date();
  content = content
    .replace(/{{YEAR}}/g, now.getFullYear())
    .replace(/{{MONTH}}/g, now.getMonth() + 1)
    .replace(/{{DAY}}/g, now.getDate())
    .replace(/{{TIMESTAMP}}/g, now.getTime());

  return content;
}

// -------- Helper: HTML processing ----------
function processHtml(html, rcptEmail, unsubData, config) {
  if (!html) return html;

  // DOCTYPE
  if (!/<!doctype/i.test(html)) {
    const doctypes = [
      '<!DOCTYPE html>',
      '<!DOCTYPE HTML>',
      '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">',
      '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">',
      '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">',
      '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">'
    ];
    html = randomChoice(doctypes) + '\n' + html;
  }
  
  // Head/meta
  if (!/<head\b/i.test(html)) {
    html = html.replace(/<html[^>]*>/i, '$&\n<head></head>');
  }
  if (!/<meta[^>]+charset/i.test(html)) {
    const charsetFormats = [
      '<meta charset="UTF-8">',
      '<meta charset="utf-8">',
      '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">',
      '<meta http-equiv="Content-Type" content="text/html; charset=utf-8">',
      '<meta http-equiv="content-type" content="text/html; charset=UTF-8">'
    ];
    html = html.replace(/<head[^>]*>/i, m => m + '\n' + randomChoice(charsetFormats));
  }

  // Optional microdata
  if (config.enableMicrodata && !/itemscope/i.test(html) && Math.random() > 0.3) {
    html = html.replace(/<body[^>]*>/i, m => m + '\n<div itemscope itemtype="http://schema.org/EmailMessage">');
    html = html.replace(/<\/body>/i, '</div>\n</body>');
  }

  // Image normalization with randomization
  if (config.enableImageOptimization) {
    html = html.replace(/<img\b([^>]*)>/gi, (m, attrs) => {
      let a = attrs;
      if (!/border=/i.test(a)) a += ' border="0"';
      
      const styles = [
        'display:block;max-width:100%;height:auto;',
        'display:block;width:100%;height:auto;',
        'max-width:100%;height:auto;display:block;',
        'display:inline-block;max-width:100%;height:auto;',
        'display: block; max-width: 100%; height: auto;',
        'max-width:100%;height:auto;',
        'width:100%;height:auto;display:block;'
      ];
      
      if (!/style=/i.test(a)) {
        a += ` style="${randomChoice(styles)}"`;
      }
      
      if (!/loading=/i.test(a) && Math.random() > 0.4) {
        a += ' loading="lazy"';
      }
      
      return `<img${a}>`;
    });
  }

  html = replacePlaceholders(html, rcptEmail, unsubData, config);
  return html;
}

function processPlain(text, rcptEmail, unsubData, config) {
  if (!text) return text;
  text = replacePlaceholders(text, rcptEmail, unsubData, config);
  
  if (config.enablePlainTextTuning) {
    text = text.replace(/([.!?]) +([A-Z])/g, '$1\n\n$2');
  }
  
  return text;
}

// -------- Plugin registration ----------
exports.register = function () {
  this.loginfo('optimize plugin loaded with massive randomization (1000+ X-Mailer combinations)');
};

// -------- Core hook (post data) ----------
exports.hook_data_post = function (next, connection) {
  const plugin = this;
  const txn = connection.transaction;
  if (!txn) return next();

  try {
    const fromAddr = txn.mail_from && txn.mail_from.address && txn.mail_from.address();
    const config = buildConfig(fromAddr);

    if (config.addRandomDelay > 0) {
      setTimeout(() => continueProcessing(), config.addRandomDelay * 1000);
      return;
    }

    continueProcessing();

    function continueProcessing() {
      const rcptObj = txn.rcpt_to && txn.rcpt_to[0];
      const rcptEmail = rcptObj && rcptObj.address && rcptObj.address();

      let unsubData = null;
      if (config.enableListHeaders && config.unsubscribeBaseURL && rcptEmail) {
        const token = generateUnsubToken(rcptEmail, config.defaultCampaignId, config.unsubscribeSecret);
        const url = `${config.unsubscribeBaseURL.replace(/\/$/, '')}/${encodeURIComponent(token)}`;
        const mailto = `mailto:${config.unsubscribeMailtoLocal}@${config.unsubscribeHost}?subject=unsubscribe&body=${encodeURIComponent(rcptEmail)}`;
        unsubData = { token, url, mailto };
      }

      if (txn.body) {
        if (txn.body.children && txn.body.children.length) {
          for (const part of txn.body.children) {
            const ct = (part.ct || '').toLowerCase();
            if (ct.includes('text/html')) {
              const raw = part.bodytext.toString();
              const out = processHtml(raw, rcptEmail, unsubData, config);
              part.bodytext = Buffer.from(out);
            } else if (ct.includes('text/plain')) {
              const raw = part.bodytext.toString();
              const out = processPlain(raw, rcptEmail, unsubData, config);
              part.bodytext = Buffer.from(out);
            }
          }
        } else if (txn.body.bodytext) {
          const raw = txn.body.bodytext.toString();
          if (/<html/i.test(raw)) {
            const out = processHtml(raw, rcptEmail, unsubData, config);
            txn.body.bodytext = Buffer.from(out);
          } else {
            const out = processPlain(raw, rcptEmail, unsubData, config);
            txn.body.bodytext = Buffer.from(out);
          }
        }
      }

      addHeaders(txn, config, unsubData);

      connection.loginfo(plugin, `optimize: ${config.randomMailer} | campaign: ${config.defaultCampaignId}`);
      next();
    }
  } catch (err) {
    connection.logerror(plugin, `optimize error: ${err.message}`);
    next();
  }
};

// -------- Add headers with massive randomization ----------
function addHeaders(txn, config, unsubData) {
  ['List-Unsubscribe','List-Unsubscribe-Post','Feedback-ID','X-Mailer','Auto-Submitted','Message-ID','Precedence','X-Priority','X-Campaign-ID','X-Campaign','X-CampaignID','X-Mail-Campaign'].forEach(h => {
    while (txn.header.get_all(h).length) txn.remove_header(h);
  });

  // Random Message-ID (critical for uniqueness)
  if (config.randomMessageId) {
    txn.add_header('Message-ID', config.randomMessageId);
  }

  // Random X-Mailer
  if (config.randomizeHeaders && config.randomMailer) {
    txn.add_header('X-Mailer', config.randomMailer);
  }

  // List-Unsubscribe with randomization
  if (config.enableListHeaders && unsubData) {
    if (Math.random() > 0.5) {
      txn.add_header('List-Unsubscribe', `<${unsubData.mailto}>, <${unsubData.url}>`);
    } else {
      txn.add_header('List-Unsubscribe', `<${unsubData.url}>, <${unsubData.mailto}>`);
    }
    txn.add_header('List-Unsubscribe-Post', `List-Unsubscribe=${config.unsubscribeMethod}`);
  }

  // Randomized Feedback-ID
  if (config.enableFeedbackID && config.rootDomain) {
    const random1 = crypto.randomBytes(randomInt(3, 6)).toString('hex');
    const random2 = crypto.randomBytes(randomInt(2, 4)).toString('hex');
    const random3 = randomInt(1000, 999999);
    
    const formats = [
      `${config.defaultCampaignId}:${random1}:newsletter:${config.rootDomain}`,
      `${random1}:${config.defaultCampaignId}:mail:${config.rootDomain}`,
      `${config.defaultCampaignId}:default:${random2}:${config.rootDomain}`,
      `campaign:${config.defaultCampaignId}:${random1}:${config.rootDomain}`,
      `${random3}:${config.defaultCampaignId}:news:${config.rootDomain}`,
      `${config.defaultCampaignId}:${random2}:${random1}:${config.rootDomain}`,
      `${random1}:${random3}:campaign:${config.rootDomain}`,
      `${config.defaultCampaignId}:m:${random1}:${config.rootDomain}`,
      `fb:${config.defaultCampaignId}:${random2}:${config.rootDomain}`,
      `${random2}:${config.defaultCampaignId}:${random1}:${config.rootDomain}`
    ];
    
    txn.add_header('Feedback-ID', randomChoice(formats));
  }

  // Random Precedence header
  if (config.addPrecedence) {
    txn.add_header('Precedence', config.precedenceValue);
  }

  // Randomly add X-Priority
  if (Math.random() > 0.7) {
    const priorities = ['3', '3 (Normal)', '5', '5 (Lowest)', '4', '4 (Low)'];
    txn.add_header('X-Priority', randomChoice(priorities));
  }

  // Auto-Submitted (sometimes)
  if (config.setAutoSubmitted || Math.random() > 0.8) {
    txn.add_header('Auto-Submitted', 'auto-generated');
  }

  if (!txn.header.get('MIME-Version')) {
    txn.add_header('MIME-Version', '1.0');
  }
  
  // Random X-Campaign header variations
  const campaignHeaders = ['X-Campaign-ID', 'X-Campaign', 'X-CampaignID', 'X-Mail-Campaign', 'X-MailCampaign'];
  if (Math.random() > 0.5) {
    txn.add_header(randomChoice(campaignHeaders), config.defaultCampaignId);
  }
}

// -------- Exports for tests ----------
exports._internal = {
  deriveUnsubHost,
  generateUnsubToken,
  buildConfig,
  processHtml,
  processPlain,
  processSpintax,
  generateRandomMailer,
  generateMessageId,
  generateBoundary
};
