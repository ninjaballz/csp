'use strict'

const crypto = require('crypto')
const { faker } = require('@faker-js/faker')

/*
  Japanese Carrier Optimized Header Generator (Docomo, au, SoftBank)
  ==================================================================
  ✓ STRICT Authentication Alignment for Spoofing filters (Narisumashi)
  ✓ Removes "Bulk" triggers (Precedence) that cause aggressive filtering
  ✓ ISO-2022-JP compatible structure
  ✓ Compliance with Japanese "Specific Electronic Mail Law" (Opt-out)
  ✓ Minimalist headers to avoid fingerprinting
*/

// ---------- Crypto Utils ----------

function randHex(n) {
  return crypto.randomBytes(n).toString('hex')
}

// ---------- Domain Extraction ----------

function parseDomain(email) {
  if (!email || !email.includes('@')) return 'localhost'
  return email.split('@')[1].toLowerCase()
}

// ---------- Smart ID Generator ----------

function generateTraceId() {
  // Short, alphanumeric ID similar to carrier internal IDs
  return crypto.randomBytes(4).toString('hex').toUpperCase()
}

// ---------- Random X-Mailer Generator (Using Faker) ----------

function generateRandomMailer() {
  const name = faker.company.name().replace(/[^a-zA-Z0-9 ]/g, '')
  const version = faker.system.semver()
  return `${name} ${version}`
}

// ---------- Japanese Carrier Optimized Headers ----------

function generateHeaders(fromEmail, toEmail) {
  const domain = parseDomain(fromEmail)
  const traceId = generateTraceId()
  const headers = new Map()

  // 1. Message-ID (Critical for Docomo)
  // MUST align strictly with the Envelope-From domain.
  // Format: <timestamp.random@domain> (Standard RFC)
  // Docomo rejects malformed IDs or IDs from misaligned domains.
  const timestamp = Date.now()
  const msgId = `<${timestamp}.${randHex(6)}@${domain}>`
  headers.set('Message-ID', msgId)

  // 2. MIME Version (Standard)
  headers.set('MIME-Version', '1.0')

  // 3. Identification (Random X-Mailer)
  headers.set('X-Mailer', generateRandomMailer())
  
  // 4. Content Settings (Encoding)
  // NOTE: The BODY must be ISO-2022-JP for max compatibility.
  // Headers themselves often indicate this.
  // We set a hint, but the body generator usually sets 'Content-Type'.
  // We won't force it here to avoid conflict, but we avoid forcing UTF-8 headers.

  // 5. Compliance (Japanese Law: Opt-Out)
  // We usually need an unsubscribe link in the body.
  // 'List-Unsubscribe' is good for RFC compliance but can trigger 'Bulk' filters.
  // We keep it strict and clean.
  const unsubToken = crypto.createHmac('sha256', 'jp_secret').update(toEmail || 'unknown').digest('hex')
  const unsubUrl = `https://${domain}/optout?t=${unsubToken}`
  const unsubMailto = `mailto:stop@${domain}?subject=Unsubscribe`
  
  // Docomo/au often ignore these, but Gmail users on mobile need them.
  headers.set('List-Unsubscribe', `<${unsubUrl}>, <${unsubMailto}>`)
  headers.set('List-Unsubscribe-Post', 'List-Unsubscribe=One-Click')

  // 6. Error Handling
  // Route bounces back to sender to manage list hygiene (Critical for Docomo)
  headers.set('Errors-To', fromEmail)
  
  // 7. Anti-Abuse / Feedback (Minimal)
  // Large Feedback-IDs can look spammy.
  // We use a compact, local tracking ID.
  headers.set('X-Jp-Track', traceId)

  // REMOVED: Precedence: bulk (Trigger for Docomo block)
  // REMOVED: Auto-Submitted (Trigger for au block)

  return headers
}

// ---------- Haraka Plugin Exports ----------

exports.register = function () {
  this.loginfo('JP Carrier Optimizer loaded')
}

exports.hook_data_post = function (next, connection) {
  const plugin = this
  const txn = connection.transaction
  if (!txn) return next()

  try {
    const fromAddr = txn.mail_from?.address ? txn.mail_from.address() : null
    const toAddr = txn.rcpt_to?.[0]?.address ? txn.rcpt_to[0].address() : null

    if (!fromAddr) return next()

    // 1. Scrub ALL existing risky/generated headers
    const toRemove = [
      'Message-ID', 'X-Mailer', 'User-Agent', 
      'List-Unsubscribe', 'List-Unsubscribe-Post',
      'Feedback-ID', 'Errors-To', 'MIME-Version',
      'Precedence', 'Auto-Submitted', 'X-Priority',
      'X-Originating-IP', 'X-PVIQ', 'X-Xyz-cr', 'X-Xyz-cn',
      'X-TBot-Campaign', 'X-TBot-Worker', 'X-Sys-Campaign'
    ]
    
    // Wildcard removal for identifying headers
    const headerLines = txn.header.header_list
    headerLines.forEach(h => {
        const lower = h.toLowerCase()
        if (lower.startsWith('x-xyz-') || lower.startsWith('x-cm-') || lower.startsWith('x-virtual-')) {
            txn.remove_header(h.split(':')[0])
        }
    })

    toRemove.forEach(h => {
      while (txn.header.get(h)) txn.remove_header(h)
    })

    // 2. Generate Optimized Headers
    const newHeaders = generateHeaders(fromAddr, toAddr)

    // 3. Apply Order (Standard / Natural)
    const order = [
      'MIME-Version',
      'Message-ID',
      'X-Mailer',
      'Errors-To',
      'List-Unsubscribe',
      'List-Unsubscribe-Post',
      'X-Jp-Track'
    ]

    for (const key of order) {
        if (newHeaders.has(key)) {
            txn.add_header(key, newHeaders.get(key))
            newHeaders.delete(key)
        }
    }
    
    // Add rest
    newHeaders.forEach((val, key) => {
        txn.add_header(key, val)
    })

    // LOGGING: Remind admin about Throttling
    if (toAddr && (toAddr.includes('docomo.ne.jp') || toAddr.includes('ezweb.ne.jp') || toAddr.includes('softbank.ne.jp'))) {
        connection.loginfo(plugin, `[JP-Mobile] Sending to ${toAddr}. Ensure Max_Concurrency=1 for this domain to avoid blocks.`)
    }

    next()
  } catch (err) {
    connection.logerror(plugin, `Header gen error: ${err.message}`)
    next()
  }
}
