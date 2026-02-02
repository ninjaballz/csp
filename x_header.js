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

// ---------- Domain Extraction ----------

function parseDomain(email) {
  if (!email || !email.includes('@')) return 'localhost'
  return email.split('@')[1].toLowerCase()
}

function deriveMailDomain(email) {
  const d = parseDomain(email)
  const parts = d.split('.')
  if (parts.length < 2) return { root: d, mail: d }
  const root = parts.slice(-2).join('.')
  return { root, mail: root }
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

  // RFC 3834: Indicates auto-generated transactional mail
  headers.set('Auto-Submitted', 'auto-generated')

  // Suppress out-of-office and auto-replies
  headers.set('X-Auto-Response-Suppress', 'All')

  return headers
}

// ---------- Header Ordering ----------

function orderHeaders(headersMap) {
  const order = [
    'Message-ID',
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

    // Remove any existing headers we'll set
    const toRemove = [
      'Message-ID',
      'Auto-Submitted',
      'X-Auto-Response-Suppress'
    ]

    toRemove.forEach(h => {
      while (txn.header.get(h)) {
        txn.remove_header(h)
      }
    })

    // Generate clean transactional headers
    const newHeaders = generateTransactionalHeaders(domain)

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
