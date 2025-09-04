const { Buffer } = require('buffer');
const crypto = require('crypto');

/*
  CONFIGURATION
  -------------
  Place your unsubscribe anchor manually in templates using {{UNSUB_URL}} or {{UNSUB_MAILTO}}.
  No footer or plain text block is injected.
*/

const from = (txn.mail_from && txn.mail_from.address && txn.mail_from.address()) || '';
if (!from.includes('@')) {
  // fallback
}

const domainFull = from.split('@')[1].toLowerCase();

const CONFIG = {
  enableMicrodata: true,
  enableImageOptimization: true,
  enablePlainTextTuning: true,
  enableListHeaders: true,
  unsubscribeBaseURL: `https://${domainFull}/unsub`,
  unsubscribeMailtoLocal: 'unsubscribe',
  unsubscribeMethod: 'One-Click',
  unsubscribeSecret: process.env.UNSUB_SECRET || 'CHANGE_ME_SECRET',
  defaultCampaignId: 'general',
  enableFeedbackID: true,
  addBodyHashHeaders: false,
  setAutoSubmitted: false,
  setStableMailerHeader: true,
  mailerHeaderValue: 'DocomoMail',
};


// ------------------ Utility Functions ------------------
function sha256(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

function hmacHex(secret, data) {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

function makeMessageId(domain) {
    const ts = Date.now();
    const rand = crypto.randomBytes(8).toString('hex');
    return `<${ts}.${rand}@${domain || 'localhost'}>`;
}

function safeDomainFromTxn(txn) {
    return (txn.mail_from && txn.mail_from.host) || 'localhost';
}

function parseRecipient(txn) {
    if (!txn.rcpt_to || !txn.rcpt_to.length) return null;
    const email = txn.rcpt_to[0].address();
    const [local, domain] = email.split('@');
    return { email, local, domain };
}

// Deterministic hour-bucket token (change if you prefer per-send uniqueness)
function generateUnsubToken(recipientEmail, campaignId, secret) {
    const hourBucket = Math.floor(Date.now() / (1000 * 60 * 60));
    const payload = `${recipientEmail}|${campaignId}|${hourBucket}`;
    const signature = hmacHex(secret, payload).slice(0, 32);
    return Buffer.from(`${payload}|${signature}`).toString('base64url');
}

// ------------------ Haraka Hooks ------------------
exports.register = function () {
    this.loginfo('HTML Optimizer (no footer) loaded');
};

exports.hook_data = function (next, connection) {
    return next();
};

exports.hook_data_post = function (next, connection) {
    const txn = connection.transaction;
    if (!txn) return next();
    try {
        if (!txn.body) {
            connection.loginfo(this, 'No body object');
            return next();
        }

        let htmlProcessed = false;
        let textProcessed = false;
        let combinedHtml = '';
        let combinedText = '';

        // Precompute unsubscribe values (so placeholders can be replaced)
        const unsubData = buildUnsubData(txn);

        if (txn.body.children && txn.body.children.length) {
            for (const part of txn.body.children) {
                const ct = (part.ct || '').toLowerCase();
                if (ct.includes('text/html')) {
                    let html = part.bodytext.toString();
                    html = processHtml(html, txn, connection, unsubData);
                    part.bodytext = Buffer.from(html);
                    htmlProcessed = true;
                    combinedHtml += html;
                } else if (ct.includes('text/plain')) {
                    let text = part.bodytext.toString();
                    text = processPlain(text, txn, unsubData);
                    part.bodytext = Buffer.from(text);
                    textProcessed = true;
                    combinedText += text;
                }
            }
        } else if (txn.body.bodytext) {
            const raw = txn.body.bodytext.toString();
            if (/<html/i.test(raw)) {
                let html = processHtml(raw, txn, connection, unsubData);
                txn.body.bodytext = Buffer.from(html);
                htmlProcessed = true;
                combinedHtml = html;
            } else {
                let text = processPlain(raw, txn, unsubData);
                txn.body.bodytext = Buffer.from(text);
                textProcessed = true;
                combinedText = text;
            }
        }

        if (CONFIG.addBodyHashHeaders && (htmlProcessed || textProcessed)) {
            txn._clean_body_hash = sha256(combinedHtml + '||' + combinedText);
        }

        optimizeHeaders(txn, connection, unsubData);

        connection.loginfo(this, 'Optimization (no footer) complete');
        next();
    } catch (e) {
        connection.logerror(this, `Optimization error: ${e.message}`);
        next();
    }
};

// ------------------ Processing Functions ------------------
function processHtml(html, txn, connection, unsubData) {
    html = ensureDoctype(html);
    html = ensureHeadMetaAndCss(html);
    html = replaceRecipientPlaceholders(html, txn);
    html = replaceUnsubPlaceholders(html, unsubData);
    if (CONFIG.enableMicrodata) html = addMicrodata(html);
    if (CONFIG.enableImageOptimization) html = tuneImages(html);
    return html;
}

function processPlain(text, txn, unsubData) {
    text = replaceRecipientPlaceholders(text, txn);
    text = replaceUnsubPlaceholders(text, unsubData);
    if (CONFIG.enablePlainTextTuning) text = optimizePlainText(text);
    return text;
}

// ------------------ HTML Helpers ------------------
function ensureDoctype(html) {
    return /<!doctype/i.test(html) ? html : '<!DOCTYPE html>\n' + html;
}

function ensureHeadMetaAndCss(html) {
    if (!/<head\b/i.test(html)) {
        html = html.replace(/<html[^>]*>/i, '$&\n<head></head>');
    }
    if (!/<meta[^>]+charset/i.test(html)) {
        html = html.replace(/<head[^>]*>/i, m => m + '\n<meta charset="UTF-8">');
    }
    if (!/viewport/i.test(html)) {
        html = html.replace(/<head[^>]*>/i, m => m + '\n<meta name="viewport" content="width=device-width,initial-scale=1">');
    }
    if (!/<style[^>]*>[^<]*body/i.test(html)) {
        const css = `
<style>
body { margin:0; padding:0; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
img { border:0; height:auto; line-height:100%; outline:none; text-decoration:none; }
table { border-collapse:collapse; }
a { color:#1a73e8; }
</style>`;
        html = html.replace(/<\/head>/i, css + '\n</head>');
    }
    return html;
}

function addMicrodata(html) {
    if (!/itemscope/i.test(html)) {
        html = html.replace(/<body[^>]*>/i, m => m + '\n<div itemscope itemtype="http://schema.org/EmailMessage">');
        html = html.replace(/<\/body>/i, '</div>\n</body>');
    }
    return html;
}

function tuneImages(html) {
    return html.replace(/<img\b([^>]*)>/gi, (m, attrs) => {
        let updated = attrs;
        if (!/border=/i.test(updated)) updated += ' border="0"';
        if (!/style=/i.test(updated)) updated += ' style="display:block;max-width:100%;height:auto;"';
        if (!/loading=/i.test(updated)) updated += ' loading="lazy"';
        return `<img${updated}>`;
    });
}

// ------------------ Placeholders ------------------
function replaceRecipientPlaceholders(content, txn) {
    const rcpt = parseRecipient(txn);
    if (!rcpt) return content;
    const masked = maskEmail(rcpt.email);
    const map = {
        '{{RECIPIENT_EMAIL}}': rcpt.email,
        '{{RECIPIENT_EMAIL_MASKED}}': masked,
        '{{RECIPIENT_USERNAME}}': rcpt.local,
        '{{RECIPIENT_DOMAIN}}': rcpt.domain
    };
    const re = new RegExp(Object.keys(map).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
    return content.replace(re, m => map[m] || m);
}

function replaceUnsubPlaceholders(content, unsubData) {
    if (!unsubData) return content;
    const map = {
        '{{UNSUB_URL}}': unsubData.url,
        '{{UNSUB_MAILTO}}': unsubData.mailto
    };
    const re = /{{UNSUB_URL}}|{{UNSUB_MAILTO}}/g;
    return content.replace(re, m => map[m] || m);
}

function maskEmail(email) {
    const [local, domain] = email.split('@');
    if (!domain) return email;
    if (local.length <= 2) return local[0] + '*@' + domain;
    if (local.length <= 5) return local[0] + '***' + local.slice(-1) + '@' + domain;
    const start = local.slice(0, Math.min(3, Math.ceil(local.length * 0.3)));
    return `${start}***${local.slice(-1)}@${domain}`;
}

// ------------------ Plain Text ------------------
function optimizePlainText(text) {
    return text.replace(/([.!?]) +([A-Z])/g, '$1\n\n$2');
}

// ------------------ Unsubscribe Data Builder ------------------
function buildUnsubData(txn) {
    if (!CONFIG.enableListHeaders) return null;
    const rcpt = parseRecipient(txn);
    if (!rcpt) return null;

    const domain = safeDomainFromTxn(txn);
    const campaign = CONFIG.defaultCampaignId;
    const token = generateUnsubToken(rcpt.email, campaign, CONFIG.unsubscribeSecret);
    const url = `${CONFIG.unsubscribeBaseURL}?t=${encodeURIComponent(token)}`;
    const mailto = `mailto:${CONFIG.unsubscribeMailtoLocal}@${domain}?subject=unsubscribe&body=${encodeURIComponent(rcpt.email)}`;

    return { token, url, mailto, email: rcpt.email, campaign };
}

// ------------------ Headers ------------------
function optimizeHeaders(txn, connection, unsubData) {
    const domain = safeDomainFromTxn(txn);

    if (!txn.header.get('Message-ID')) {
        txn.add_header('Message-ID', makeMessageId(domain));
    }

    if (!txn.header.get('MIME-Version')) {
        txn.add_header('MIME-Version', '1.0');
    }

    if (CONFIG.setStableMailerHeader) {
        if (txn.header.get('X-Mailer')) txn.remove_header('X-Mailer');
        txn.add_header('X-Mailer', CONFIG.mailerHeaderValue);
    }

    if (CONFIG.enableFeedbackID && !txn.header.get('Feedback-ID')) {
        txn.add_header('Feedback-ID', `${CONFIG.defaultCampaignId}:default:notification:${domain}`);
    }

    if (CONFIG.enableListHeaders && unsubData) {
        if (txn.header.get('List-Unsubscribe')) txn.remove_header('List-Unsubscribe');
        txn.add_header('List-Unsubscribe', `<${unsubData.mailto}>, <${unsubData.url}>`);
        if (CONFIG.unsubscribeMethod && !txn.header.get('List-Unsubscribe-Post')) {
            txn.add_header('List-Unsubscribe-Post', `List-Unsubscribe=${CONFIG.unsubscribeMethod}`);
        }
    }

    if (CONFIG.setAutoSubmitted) {
        txn.add_header('Auto-Submitted', 'auto-generated');
    }

    if (CONFIG.addBodyHashHeaders && txn._clean_body_hash) {
        txn.add_header('X-Body-Hash', txn._clean_body_hash);
    }

    connection.loginfo('headers', 'Headers set (no footer variant)');
}

// ------------------ Internal Exports (optional for tests) ------------------
exports._internal = {
    processHtml,
    processPlain,
    buildUnsubData,
    generateUnsubToken
};
