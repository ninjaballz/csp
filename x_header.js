'use strict'

const crypto = require('crypto')

/*
  Transactional Email Header Generator
  =====================================
  ✓ Clean RFC-compliant headers for transactional emails
  ✓ Password resets, order confirmations, receipts, alerts
  ✓ No marketing/bulk indicators
*/

// ---------- Crypto Utils ----------

function randHex(n) {
  return crypto.randomBytes(n).toString('hex')
}

// ---------- RFC 2047 Encoding (MIME Header Encoding) ----------

function encodeRFC2047(str) {
  // If ASCII, return as is
  if (/^[\x00-\x7F]*$/.test(str)) return str
  
  // Encode as UTF-8 Base64
  const b64 = Buffer.from(str).toString('base64')
  return `=?UTF-8?B?${b64}?=`
}

// ---------- Domain Extraction ----------

function parseDomain(email) {
  if (!email || !email.includes('@')) return 'localhost'
  return email.split('@')[1].toLowerCase()
}

function deriveMailDomain(domain) {
  const parts = domain.split('.')
  if (parts.length < 2) return { root: domain, mail: domain }
  const root = parts.slice(-2).join('.')
  return { root, mail: root }
}

// ---------- MIME Encoding Utils (RFC 2047) ----------

function encodeRFC2047(str) {
  // ASCII-only doesn't need encoding
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(str)) return str
  
  // Use Base64 UTF-8 encoding: =?UTF-8?B?...?=
  const b64 = Buffer.from(str).toString('base64')
  return `=?UTF-8?B?${b64}?=`
}

// ---------- Date Header (Japanese Time +0900) ----------

function generateJapanDate() {
  const now = new Date()
  // Convert to Japan time (UTC+9)
  const japanOffset = 9 * 60 // minutes
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const japanTime = new Date(utc + japanOffset * 60000)

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const day = days[japanTime.getUTCDay()]
  const date = String(japanTime.getUTCDate()).padStart(2, '0')
  const month = months[japanTime.getUTCMonth()]
  const year = japanTime.getUTCFullYear()
  const hours = String(japanTime.getUTCHours()).padStart(2, '0')
  const minutes = String(japanTime.getUTCMinutes()).padStart(2, '0')
  const seconds = String(japanTime.getUTCSeconds()).padStart(2, '0')

  return `${day}, ${date} ${month} ${year} ${hours}:${minutes}:${seconds} +0900`
}

// ---------- Message ID (RFC 5322 Compliant) ----------

function generateMessageId(domain) {
  const ts = Date.now().toString(36)
  const rnd = randHex(8)
  return `<${ts}-${rnd}@${domain}>`
}

// ---------- Transactional Headers ----------

function generateTransactionalHeaders(domain) {
  const headers = new Map()
  const { root } = deriveMailDomain(domain)

  // RFC-compliant Message-ID
  headers.set('Message-ID', generateMessageId(root))

  // RFC 2822 Date in Japanese timezone
  headers.set('Date', generateJapanDate())

  // Japan/Mobile Carrier Deliverability hints
  headers.set('Content-Language', 'ja')
  headers.set('MIME-Version', '1.0')

  // RFC 3834: Indicates auto-generated transactional mail
  headers.set('Auto-Submitted', 'auto-generated')

  // Suppress out-of-office and auto-replies
  headers.set('X-Auto-Response-Suppress', 'All')

  // --- Japanese Deliverability Best Practices ---
  
  // Content-Language: ja helps spam filters and carriers understand the context
  headers.set('Content-Language', 'ja')

  // MIME-Version MUST be present
  headers.set('MIME-Version', '1.0')

  return headers
}

// ---------- Header Ordering ----------

function orderHeaders(headersMap) {
  const order = [
    'Message-ID',
    'Date',
    'MIME-Version',
    'Content-Language',
    'Content-Type',
    'Content-Transfer-Encoding',
    'Auto-Submitted',
    'X-Auto-Response-Suppress'
  ]

  const sorted = []
  for (const h of order) {
    if (headersMap.has(h)) {
      sorted.push({ name: h, value: headersMap.get(h) })
      headersMap.delete(h)
    }
  }

  headersMap.forEach((v, k) => sorted.push({ name: k, value: v }))

  return sorted
}

// ---------- Haraka Plugin Exports ----------

exports.register = function () {
  this.loginfo('Transactional Email Header Generator loaded')
}

exports.hook_data_post = function (next, connection) {
  const plugin = this
  const txn = connection.transaction
  if (!txn) return next()

  try {
    const fromAddr = txn.mail_from?.address ? txn.mail_from.address() : null

    if (!fromAddr) return next()

    const domain = parseDomain(fromAddr)

    // Remove headers we will regenerate or that are harmful for Japan deliverability
    const toRemove = [
      'Message-ID',
      'Date',
      'Auto-Submitted',
      'X-Auto-Response-Suppress',
      'X-Mailer',      // Generic mailers are penalized by Japanese ISPs
      'X-Priority',    // Urgent/High priority flags are often treated as spam
      'Priority',
      'Importance'
    ]

    toRemove.forEach(h => {
      while (txn.header.get(h)) {
        txn.remove_header(h)
      }
    })

    // Ensure Subject is RFC 2047 encoded (Critical for Japanese characters)
    const existingSubject = txn.header.get('Subject')
    if (existingSubject) {
      const encodedSubject = encodeRFC2047(existingSubject)
      if (encodedSubject !== existingSubject) {
        txn.remove_header('Subject')
        txn.add_header('Subject', encodedSubject)
      }
    }

    // Generate clean transactional headers
    const newHeaders = generateTransactionalHeaders(domain)

    // Default to UTF-8/Base64 if no Content-Type is present to ensure
    // Japanese characters are handled correctly on legacy carriers
    if (!txn.header.get('Content-Type')) {
      newHeaders.set('Content-Type', 'text/plain; charset="UTF-8"')
      newHeaders.set('Content-Transfer-Encoding', 'base64')
    }

    // Apply in proper order
    const ordered = orderHeaders(newHeaders)
    for (const { name, value } of ordered) {
      txn.add_header(name, value)
    }

    connection.loginfo(plugin, `MsgID=${newHeaders.get('Message-ID')}`)
    next()
  } catch (err) {
    connection.logerror(plugin, `Header generation error: ${err.message}`)
    next()
  }
}
