'use strict'

const crypto = require('crypto')

/*
  Professional & Unique Email Header Generator (Internal Use / Anti-Fingerprint)
  ------------------------------------------------------------------------------
  - Mimics consistent corporate environments (Outlook / Exchange / Apple Mail)
  - Applies unique patterns per email to prevent static filter fingerprints
  - Standardized header ordering (Corporate Compliant) with subtle entropy
  - Removes unsolicited "bulk" headers
*/

// ---------- Utilities ----------

function cryptoRandom(min, max) {
  return crypto.randomInt(min, max + 1)
}

function randBytesHex(nBytes) {
  return crypto.randomBytes(nBytes).toString('hex')
}

function pick(arr) {
  return arr[cryptoRandom(0, arr.length - 1)]
}

// ---------- ID Generators (Professional Format) ----------

function generateMessageId(domain) {
  const d = domain || 'localhost'
  const ts = Date.now()

  // Mix of Exchange-style and standard GUIDs to look "Corporate" but varied
  if (cryptoRandom(0, 100) < 60) {
    // Exchange Style: <Hex.Base64@domain>
    const prefix = randBytesHex(4)
    const core = crypto.randomBytes(12).toString('base64').replace(/\W/g, '') // alphanumeric clean
    return `<${prefix}.${core}.${ts}@${d}>`
  } else {
    // Outlook Desktop / GUID Style
    const guid = crypto.randomUUID().toUpperCase()
    return `<${guid}@${d}>`
  }
}

function generateThreadIndex() {
  // Outlook Thread-Index: ~30 bytes base64.
  // Starts with 6 bytes time, then 16 bytes GUID/Random
  const buf = Buffer.alloc(22)
  const dateVal = Date.now()
  // Mock filetime high bits
  buf.writeUInt32BE(Math.floor(dateVal / 1000), 0)
  crypto.randomFillSync(buf, 6, 16)
  return buf.toString('base64')
}

// ---------- Client Simulation ----------

function selectEmailClient() {
  // Simulate a standard mixed corporate environment
  // Predominantly Outlook (Windows), some Apple Mail (Mac execs/mobile)
  const roll = cryptoRandom(0, 100)
  if (roll < 75) return 'outlook'
  if (roll < 95) return 'appleMail'
  return 'outlook' // Default to Outlook
}

function synthesizeUserAgent(clientType) {
  // Generate valid, professional User-Agent / X-Mailer strings
  // Randomize VERISONS to create unique fingerprints per email

  if (clientType === 'appleMail') {
    // macOS major versions
    const macVer = pick(['13_6_1', '14_1_2', '14_2_1', '12_7_1'])
    const mailVer = pick(['16.0', '15.0', '14.0'])
    // Sometimes simple "Apple Mail (2.X)"
    return `Apple Mail (${mailVer})`
  }

  // Outlook (most common professional signer)
  // "Microsoft Outlook 16.0.XXXX.XXXX"
  const major = '16.0' // Office 2016/2019/365 standard ID
  const build = cryptoRandom(4000, 18000) // Huge range of valid builds
  const revision = pick(['1000', '1001', '1002', '2000', '2001'])
  return `Microsoft Outlook ${major}.${build}.${revision}`
}

// ---------- Header Logic ----------

function buildConfig(fromAddress) {
  // Extract domain
  let domain = 'localhost'
  if (fromAddress && fromAddress.includes('@')) {
    domain = fromAddress.split('@')[1]
  }

  const clientType = selectEmailClient()
  const userAgent = synthesizeUserAgent(clientType)
  const messageId = generateMessageId(domain)

  // Unique Internal Trace ID (entropy for filters, looks like internal routing)
  // e.g. X-Entity-Ref-ID: 48293-F9A
  const internalId = `${cryptoRandom(10000, 99999)}-${randBytesHex(3).toUpperCase()}`

  // Thread Index for Outlook
  const threadIndex = clientType === 'outlook' ? generateThreadIndex() : null

  return {
    clientType,
    userAgent,
    messageId,
    internalId,
    threadIndex
  }
}

function getProfessionalHeaderOrder(headersMap) {
  // Define strict professional order for fields we control
  const idealOrder = [
    'Date',
    'From',
    'To',
    'Subject',
    'Message-ID',
    'Thread-Topic',
    'Thread-Index',
    'X-Mailer',
    'MIME-Version',
    'Content-Type'
  ]

  // We only return keys that exist in our map
  const sorted = []
  const keys = Array.from(headersMap.keys())

  // 1. Add ideal headers in order
  for (const h of idealOrder) {
    if (headersMap.has(h)) {
      sorted.push({ name: h, value: headersMap.get(h) })
      headersMap.delete(h)
    }
  }

  // 2. Add remaining headers (Custom X- headers, Entropy headers)
  // Shuffle them slightly to vary the fingerprint
  const remaining = Array.from(headersMap.entries()).map(([k, v]) => ({ name: k, value: v }))

  if (remaining.length > 1) {
    // Fisher-Yates shuffle for remaining X-headers
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = cryptoRandom(0, i)
      ;[remaining[i], remaining[j]] = [remaining[j], remaining[i]]
    }
  }

  return [...sorted, ...remaining]
}

// ---------- Haraka Exports ----------

exports.register = function () {
  this.loginfo('Loaded Professional/Unique Header Plugin (Internal Corporate Pattern)')
}

exports.hook_data_post = function (next, connection) {
  const plugin = this
  const txn = connection.transaction
  if (!txn) return next()

  try {
    const fromAddr = txn.mail_from?.address ? txn.mail_from.address() : ''
    const config = buildConfig(fromAddr)

    // 1. Strip Unprofessional / Spammy Headers
    // We remove these to ensure we have a clean slate for the "Corporate" look
    const headersToRemove = [
      'X-Mailer',
      'User-Agent',
      'Message-ID',
      'X-Campaign',
      'X-Campaign-ID',
      'Feedback-ID',
      'Precedence', // "bulk" is bad for inboxing usually
      'X-Priority', // often flagged
      'List-Unsubscribe', // Remove by default for "Internal" look, or manage manually
      'List-Unsubscribe-Post'
    ]

    headersToRemove.forEach(h => {
      txn.remove_header(h)
    })

    // 2. Construct New Professional Headers
    const newHeaders = new Map()

    // Identity
    newHeaders.set('Message-ID', config.messageId)
    newHeaders.set('X-Mailer', config.userAgent)

    // Outlook Specifics
    if (config.threadIndex) {
      newHeaders.set('Thread-Index', config.threadIndex)
      // Sometimes add X-MimeOLE to match X-Mailer (Standard Microsoft Pair)
      const buildNum = config.userAgent.split(' ')[2] || '16.0.0.0'
      newHeaders.set('X-MimeOLE', `Produced By Microsoft MimeOLE V${buildNum}`)
    }

    // Entropy Header (Unique Pattern)
    // Looks like an internal Gateway ID
    newHeaders.set('X-Gtwy-Svc-ID', config.internalId)

    // 3. Apply Headers
    const orderedHeaders = getProfessionalHeaderOrder(newHeaders)

    for (const h of orderedHeaders) {
      txn.add_header(h.name, h.value)
    }

    connection.loginfo(plugin, `Generated Corporate Header: ${config.clientType} | ${config.messageId}`)
    next()
  } catch (err) {
    connection.logerror(plugin, `Header Gen Error: ${err.message}`)
    next() // Fail open
  }
}
