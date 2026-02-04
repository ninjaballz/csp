'use strict'

const crypto = require('crypto')

/*
  High-Reputation Marketing Email Header Generator
  =====================================================
  ✓ Designed for CONSISTENT inbox delivery to customers
  ✓ RFC-compliant bulk/marketing headers (List-Unsubscribe, Feedback-ID, Precedence)
  ✓ Unique watermarks per message to evade static fingerprinting
  ✓ Mimics legitimate ESPs (SendGrid, Mailchimp, HubSpot, AWS SES patterns)
*/

// ---------- Crypto Utils ----------

function cryptoRand(min, max) {
  return crypto.randomInt(min, max + 1)
}

function randHex(n) {
  return crypto.randomBytes(n).toString('hex')
}

function randB64(n) {
  return crypto.randomBytes(n).toString('base64url')
}

// ---------- Domain Extraction ----------

function parseDomain(email) {
  if (!email || !email.includes('@')) return 'localhost'
  return email.split('@')[1].toLowerCase()
}

function deriveMailDomain(email) {
  const d = parseDomain(email)
  const parts = d.split('.')
  if (parts.length < 2) return { root: d, mail: `mail.${d}` }
  const root = parts.slice(-2).join('.')
  return { root, mail: `mail.${root}` }
}

// ---------- Message ID (RFC-Compliant, Unique) ----------

function generateMessageId(domain) {
  // Format: <timestamp-random@domain>
  // Strictly RFC 5322 compliant, clean, unique
  const ts = Date.now().toString(36)
  const rnd = randHex(8)
  return `<${ts}-${rnd}@${domain}>`
}

// ---------- Feedback-ID (Standard ESP Format) ----------

function generateFeedbackId(domain) {
  // Standard Format: campaign:customer:message:sender
  // Randomized per-message but formatted like real ESPs
  const campaign = `c${Date.now().toString(36)}${randHex(2)}`
  const customer = `u${randHex(4)}`
  const message = randB64(6)
  const sender = domain.split('.')[0] || 'mail'

  return `${campaign}:${customer}:${message}:${sender}`
}

// ---------- List-Unsubscribe Token ----------

function generateUnsubToken(email, domain) {
  const secret = process.env.UNSUB_SECRET || randHex(16)
  const ts = Date.now()
  const payload = `${email}|${ts}|${randHex(4)}`
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('base64url').slice(0, 24)
  return Buffer.from(`${payload}|${hmac}`).toString('base64url')
}

// ---------- ESP Simulation (SendGrid/Mailchimp/AWS SES Style) ----------

function selectESP() {
  // Rotate between major ESP patterns for header diversity
  const esps = ['sendgrid', 'mailchimp', 'awsses', 'sendgrid', 'mailchimp'] // weighted
  return esps[cryptoRand(0, esps.length - 1)]
}

function generateESPHeaders(esp, domain, toEmail) {
  const headers = new Map()
  const { root, mail } = deriveMailDomain(domain)

  // Common to all ESPs
  headers.set('Message-ID', generateMessageId(mail))
  headers.set('Feedback-ID', generateFeedbackId(root))

  // List-Unsubscribe (CRITICAL for inbox placement)
  const token = generateUnsubToken(toEmail || 'user@example.com', root)
  const unsubUrl = `https://${mail}/u/${token}`
  const unsubMailto = `mailto:unsub@${mail}?subject=unsubscribe`
  headers.set('List-Unsubscribe', `<${unsubUrl}>, <${unsubMailto}>`)
  headers.set('List-Unsubscribe-Post', 'List-Unsubscribe=One-Click')

  // Precedence (bulk is REQUIRED for marketing - shows legitimacy)
  headers.set('Precedence', 'bulk')

  if (esp === 'sendgrid') {
    // SendGrid-specific
    const sgId = `${randHex(8)}.${randHex(8)}`
    headers.set('X-SG-EID', sgId)
    headers.set('X-SG-ID', randB64(12))
    headers.set('X-Mailer', 'SendGrid')
  } else if (esp === 'mailchimp') {
    // Mailchimp-specific
    const mcCampaign = randHex(10)
    headers.set('X-MC-User', randHex(10))
    headers.set('X-Campaign', mcCampaign)
    headers.set('X-Mailer', 'MailChimp Mailer')
  } else if (esp === 'awsses') {
    // AWS SES-specific
    const configSet = `cs-${randHex(6)}`
    const msgId = randB64(20)
    headers.set('X-SES-Outgoing', msgId)
    headers.set('X-SES-CONFIGURATION-SET', configSet)
    headers.set('X-Mailer', 'Amazon SES')
  }

  // Add entropy header (unique watermark, looks like internal tracking)
  const trackId = `${cryptoRand(100000, 999999)}-${randHex(4).toUpperCase()}`
  headers.set('X-Entity-Ref-ID', trackId)

  return headers
}

// ---------- Header Ordering (Professional/Standard) ----------

function orderHeaders(headersMap) {
  // Standard order for marketing emails (RFC + ESP best practices)
  const order = [
    'Message-ID',
    'X-SG-EID',
    'X-SG-ID',
    'X-MC-User',
    'X-Campaign',
    'X-SES-Outgoing',
    'X-SES-CONFIGURATION-SET',
    'X-Mailer',
    'Feedback-ID',
    'List-Unsubscribe',
    'List-Unsubscribe-Post',
    'Precedence',
    'X-Entity-Ref-ID'
  ]

  const sorted = []
  for (const h of order) {
    if (headersMap.has(h)) {
      sorted.push({ name: h, value: headersMap.get(h) })
      headersMap.delete(h)
    }
  }

  // Add any remaining headers
  headersMap.forEach((v, k) => sorted.push({ name: k, value: v }))

  return sorted
}

// ---------- Haraka Plugin Exports ----------

exports.register = function () {
  this.loginfo('Marketing Email Header Generator loaded (High Inbox Delivery)')
}

exports.hook_data_post = function (next, connection) {
  const plugin = this
  const txn = connection.transaction
  if (!txn) return next()

  try {
    const fromAddr = txn.mail_from?.address ? txn.mail_from.address() : null
    const toAddr = txn.rcpt_to?.[0]?.address ? txn.rcpt_to[0].address() : null

    if (!fromAddr) return next()

    const domain = parseDomain(fromAddr)
    const esp = selectESP()

    // Remove old headers to ensure clean slate
    const toRemove = [
      'Message-ID',
      'X-Mailer',
      'X-SG-EID',
      'X-SG-ID',
      'X-MC-User',
      'X-Campaign',
      'X-SES-Outgoing',
      'X-SES-CONFIGURATION-SET',
      'Feedback-ID',
      'List-Unsubscribe',
      'List-Unsubscribe-Post',
      'Precedence',
      'X-Entity-Ref-ID'
    ]

    toRemove.forEach(h => {
      while (txn.header.get(h)) {
        txn.remove_header(h)
      }
    })

    // Generate ESP-appropriate headers
    const newHeaders = generateESPHeaders(esp, domain, toAddr)

    // Apply in proper order
    const ordered = orderHeaders(newHeaders)
    for (const { name, value } of ordered) {
      txn.add_header(name, value)
    }

    connection.loginfo(plugin, `ESP=${esp} | MsgID=${newHeaders.get('Message-ID')?.slice(0, 40)}...`)
    next()
  } catch (err) {
    connection.logerror(plugin, `Header generation error: ${err.message}`)
    next() // Fail open - don't block email
  }
}
