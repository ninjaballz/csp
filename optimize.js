'use strict';

const crypto = require('crypto');

/*
  Haraka Optimize / Unsubscribe Plugin (minimal working version)
  --------------------------------------------------------------
  Put this file at: /opt/haraka/plugins/optimize.js
  Enable in: /opt/haraka/config/plugins  (add a line: optimize)

  Environment:
    export UNSUB_SECRET="a_really_long_random_secret_here"

  Notes:
  - All txn-dependent logic MUST be inside hooks (e.g. hook_data_post).
  - Do not reference txn at top-level (that caused your crash).
*/

// -------- Helper: derive host pieces (SIMPLE version) ----------
function deriveUnsubHost(fromAddress) {
  // Returns { host, subLabel, rootDomain, domainFull }
  if (!fromAddress || !fromAddress.includes('@')) {
    return { host: null, subLabel: 'mail', rootDomain: null, domainFull: null };
  }
  const domainFull = fromAddress.split('@')[1].toLowerCase();
  const parts = domainFull.split('.').filter(Boolean);

  if (!parts.length) {
    return { host: null, subLabel: 'mail', rootDomain: null, domainFull };
  }

  const rootDomain = parts.slice(-2).join('.');                // simple root (example.com)
  const subLabel = parts.length > 2 ? parts[0] : 'mail';       // first label or 'mail'
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

// -------- Helper: build per-message CONFIG ----------
function buildConfig(fromAddress) {
  const { host, rootDomain } = deriveUnsubHost(fromAddress || '');
  // host can be null if parsing failed; handle downstream.

  return {
    enableMicrodata: true,
    enableImageOptimization: true,
    enablePlainTextTuning: true,

    // Unsubscribe
    enableListHeaders: true,
    enableUnsubPlaceholders: true,
    unsubscribeHost: host,                   // derived host (e.g., abc123.example.com or mail.example.com)
    unsubscribeBaseURL: host ? `https://${host}/unsub` : null,
    unsubscribeMailtoLocal: 'unsubscribe',
    unsubscribeMethod: 'One-Click',
    unsubscribeSecret: process.env.UNSUB_SECRET || 'CHANGESBEB019201',

    // Campaign identifiers
    defaultCampaignId: 'general',
    enableFeedbackID: true,
    rootDomain,                              // may be used in Feedback-ID

    // Extra headers
    addBodyHashHeaders: false,
    setAutoSubmitted: false,
    setStableMailerHeader: true,
    mailerHeaderValue: 'DocomoMail'
  };
}

// -------- Helper: replace placeholders in a body part ----------
function replacePlaceholders(content, rcptEmail, unsubData, config) {
  if (!content) return content;

  // Recipient placeholders (basic)
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

  return content;
}

// -------- Helper: light HTML normalization (optional) ----------
function processHtml(html, rcptEmail, unsubData, config) {
  if (!html) return html;

  // DOCTYPE
  if (!/<!doctype/i.test(html)) {
    html = '<!DOCTYPE html>\n' + html;
  }
  // Head/meta
  if (!/<head\b/i.test(html)) {
    html = html.replace(/<html[^>]*>/i, '$&\n<head></head>');
  }
  if (!/<meta[^>]+charset/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, m => m + '\n<meta charset="UTF-8">');
  }

  // Optional microdata
  if (config.enableMicrodata && !/itemscope/i.test(html)) {
    html = html.replace(/<body[^>]*>/i, m => m + '\n<div itemscope itemtype="http://schema.org/EmailMessage">');
    html = html.replace(/<\/body>/i, '</div>\n</body>');
  }

  // Image normalization
  if (config.enableImageOptimization) {
    html = html.replace(/<img\b([^>]*)>/gi, (m, attrs) => {
      let a = attrs;
      if (!/border=/i.test(a)) a += ' border="0"';
      if (!/style=/i.test(a)) a += ' style="display:block;max-width:100%;height:auto;"';
      if (!/loading=/i.test(a)) a += ' loading="lazy"';
      return `<img${a}>`;
    });
  }

  // Placeholder replacement
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
  this.loginfo('optimize plugin loaded');
};

// -------- Core hook (post data) ----------
exports.hook_data_post = function (next, connection) {
  const plugin = this;
  const txn = connection.transaction;
  if (!txn) return next();

  try {
    const fromAddr = txn.mail_from && txn.mail_from.address && txn.mail_from.address();
    const config = buildConfig(fromAddr);

    // We may have multiple RCPTs; use the first for token + placeholders
    const rcptObj = txn.rcpt_to && txn.rcpt_to[0];
    const rcptEmail = rcptObj && rcptObj.address && rcptObj.address();

    // Build unsubscribe data
    let unsubData = null;
    if (config.enableListHeaders && config.unsubscribeBaseURL && rcptEmail) {
      const token = generateUnsubToken(rcptEmail, config.defaultCampaignId, config.unsubscribeSecret);
      const url = `${config.unsubscribeBaseURL.replace(/\/$/, '')}/${encodeURIComponent(token)}`;
      const mailto = `mailto:${config.unsubscribeMailtoLocal}@${config.unsubscribeHost}?subject=unsubscribe&body=${encodeURIComponent(rcptEmail)}`;
      unsubData = { token, url, mailto };
    }

    // Process MIME structure
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

    // Add headers
    addHeaders(txn, config, unsubData);

    connection.loginfo(plugin, `optimize: processed message from ${fromAddr || 'unknown'}`);
    next();
  } catch (err) {
    connection.logerror(plugin, `optimize error: ${err.message}`);
    next();
  }
};

// -------- Add headers ----------
function addHeaders(txn, config, unsubData) {
  // Remove potentially existing ones we control
  ['List-Unsubscribe','List-Unsubscribe-Post','Feedback-ID','X-Mailer','Auto-Submitted'].forEach(h => {
    while (txn.header.get_all(h).length) txn.remove_header(h);
  });

  if (config.enableListHeaders && unsubData) {
    txn.add_header('List-Unsubscribe', `<${unsubData.mailto}>, <${unsubData.url}>`);
    txn.add_header('List-Unsubscribe-Post', `List-Unsubscribe=${config.unsubscribeMethod}`);
  }

  if (config.enableFeedbackID && config.rootDomain) {
    txn.add_header('Feedback-ID', `${config.defaultCampaignId}:default:newsletter:${config.rootDomain}`);
  }

  if (config.setStableMailerHeader) {
    txn.add_header('X-Mailer', config.mailerHeaderValue);
  }

  if (config.setAutoSubmitted) {
    txn.add_header('Auto-Submitted', 'auto-generated');
  }

  if (!txn.header.get('MIME-Version')) {
    txn.add_header('MIME-Version', '1.0');
  }
}

// -------- (Optional) exports for tests ----------
exports._internal = {
  deriveUnsubHost,
  generateUnsubToken,
  buildConfig,
  processHtml,
  processPlain
};
