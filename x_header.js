'use strict'

const crypto = require('crypto')
const { faker } = require('@faker-js/faker')

/*
  Polymorphic Header Generator - Maximum Uniqueness
  ==================================================
  ✓ Each email has completely different header patterns
  ✓ Random inclusion/exclusion of optional headers
  ✓ Varied Message-ID formats mimicking different mail clients
  ✓ Random X-Mailer / User-Agent selection
  ✓ Randomized header ordering
*/

// ---------- Crypto Utils ----------

function randHex(n) {
  return crypto.randomBytes(n).toString('hex')
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function coinFlip(probability = 0.5) {
  return Math.random() < probability
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ---------- Domain Extraction ----------

function parseDomain(email) {
  if (!email || !email.includes('@')) return 'localhost'
  return email.split('@')[1].toLowerCase()
}

function getLocalPart(email) {
  if (!email || !email.includes('@')) return 'user'
  return email.split('@')[0].toLowerCase()
}

// ---------- Polymorphic Message-ID Generators ----------

function generateMessageId(domain) {
  const formats = [
    // Outlook style
    () => {
      const guid = crypto.randomUUID().toUpperCase()
      return `<${guid}@${domain}>`
    },
    // Gmail style
    () => {
      const part1 = randHex(8)
      const part2 = randHex(4)
      const part3 = randHex(4)
      return `<${part1}.${part2}.${Date.now()}.${part3}@${domain}>`
    },
    // Thunderbird style
    () => {
      const uuid = crypto.randomUUID().replace(/-/g, '')
      return `<${uuid}@${domain}>`
    },
    // Apple Mail style
    () => {
      const id = randHex(12).toUpperCase()
      return `<${id}-${randInt(1000, 9999)}@${domain}>`
    },
    // Classic timestamp style
    () => {
      return `<${Date.now()}.${randHex(6)}@${domain}>`
    },
    // Yahoo style
    () => {
      const num = randInt(100000000, 999999999)
      return `<${num}.${randInt(10000, 99999)}.${Date.now()}@${domain}>`
    },
    // Postfix style
    () => {
      const hex = randHex(10).toUpperCase()
      return `<${hex}.${randHex(5)}@${domain}>`
    },
    // SendGrid style
    () => {
      const filter = randHex(16)
      return `<${filter}.${randInt(1, 99999)}@${domain}>`
    }
  ]
  return pickRandom(formats)()
}

// ---------- Polymorphic X-Mailer / User-Agent ----------

function generateMailClient() {
  const clients = [
    // Desktop clients
    () => `Microsoft Outlook ${randInt(14, 16)}.0.${randInt(10000, 19999)}.${randInt(10000, 29999)}`,
    () => `Mozilla Thunderbird ${randInt(78, 115)}.${randInt(0, 12)}.${randInt(0, 5)}`,
    () => `Apple Mail (${randInt(2, 3)}.${randInt(0, 6)} ${randInt(3600, 3700)}.${randInt(100, 200)}.${randInt(1, 50)})`,
    () => `The Bat! ${randInt(9, 11)}.${randInt(0, 5)}`,
    () => `eM Client ${randInt(7, 9)}.${randInt(0, 2)}.${randInt(1000, 9999)}.0`,
    () => `Mailbird ${randInt(2, 3)}.${randInt(0, 9)}.${randInt(0, 99)}.0`,
    // Web clients
    () => null, // Some emails have no X-Mailer
    () => `Roundcube Webmail/${randInt(1, 1)}.${randInt(4, 6)}.${randInt(0, 15)}`,
    () => `Horde Application Framework ${randInt(5, 5)}.${randInt(2, 2)}.${randInt(20, 23)}`,
    () => `SquirrelMail/${randInt(1, 1)}.${randInt(4, 4)}.${randInt(20, 23)}`,
    // Mobile
    () => `iPhone Mail (${randInt(15, 18)}${String.fromCharCode(randInt(65, 72))}${randInt(100, 999)})`,
    () => `Samsung Mail ${randInt(5, 7)}.${randInt(0, 9)}.${randInt(0, 50)}`,
    // Fake company names
    () => `${faker.company.name().replace(/[^a-zA-Z0-9 ]/g, '')} ${faker.system.semver()}`,
    () => `${faker.word.noun()}mail ${randInt(1, 5)}.${randInt(0, 9)}.${randInt(0, 99)}`
  ]
  return pickRandom(clients)()
}

function generateUserAgent() {
  const agents = [
    () => `Mozilla/5.0 (Windows NT 10.0; Win64; x64) Gecko/${randInt(20100101, 20251231)} Thunderbird/${randInt(78, 115)}.${randInt(0, 12)}`,
    () => `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_${randInt(13, 15)}_${randInt(0, 7)}) AppleWebKit/${randInt(600, 650)}.${randInt(1, 9)}.${randInt(1, 20)}`,
    () => `Microsoft-MacOutlook/${randInt(16, 16)}.${randInt(50, 80)}.${randInt(21000000, 23999999)}`,
    () => null
  ]
  return pickRandom(agents)()
}

// ---------- Optional Headers Pool ----------

function generateOptionalHeaders(domain, fromEmail, toEmail) {
  const pool = []
  
  // X-Originating-IP (some clients add this)
  if (coinFlip(0.2)) {
    pool.push(['X-Originating-IP', `[${randInt(1, 223)}.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(1, 254)}]`])
  }
  
  // X-Priority (random priority levels)
  if (coinFlip(0.15)) {
    pool.push(['X-Priority', pickRandom(['1', '3', '5'])])
  }
  
  // X-MSMail-Priority
  if (coinFlip(0.1)) {
    pool.push(['X-MSMail-Priority', pickRandom(['High', 'Normal', 'Low'])])
  }
  
  // Importance
  if (coinFlip(0.1)) {
    pool.push(['Importance', pickRandom(['high', 'normal', 'low'])])
  }
  
  // Organization
  if (coinFlip(0.25)) {
    pool.push(['Organization', faker.company.name()])
  }
  
  // X-MimeOLE
  if (coinFlip(0.15)) {
    pool.push(['X-MimeOLE', `Produced By Microsoft MimeOLE V${randInt(6, 16)}.${randInt(0, 9)}.${randInt(1000, 9999)}.${randInt(0, 9999)}`])
  }
  
  // X-Spam-Status
  if (coinFlip(0.1)) {
    pool.push(['X-Spam-Status', 'No'])
  }
  
  // Thread-Topic (sometimes added)
  if (coinFlip(0.15)) {
    pool.push(['Thread-Topic', faker.lorem.words(randInt(2, 5))])
  }
  
  // X-Auto-Response-Suppress
  if (coinFlip(0.1)) {
    pool.push(['X-Auto-Response-Suppress', pickRandom(['DR', 'NDR', 'RN', 'NRN', 'OOF', 'AutoReply', 'All'])])
  }
  
  // Accept-Language
  if (coinFlip(0.2)) {
    const langs = ['ja-JP', 'en-US', 'en-GB', 'ja', 'en-US, ja-JP', 'ja-JP, en-US']
    pool.push(['Accept-Language', pickRandom(langs)])
  }
  
  // Content-Language
  if (coinFlip(0.2)) {
    pool.push(['Content-Language', pickRandom(['ja', 'ja-JP', 'en-US', 'en'])])
  }
  
  // X-MS-Has-Attach
  if (coinFlip(0.1)) {
    pool.push(['X-MS-Has-Attach', 'no'])
  }
  
  // X-MS-TNEF-Correlator (empty, Outlook style)
  if (coinFlip(0.08)) {
    pool.push(['X-MS-TNEF-Correlator', ''])
  }
  
  // References / In-Reply-To (fake thread)
  if (coinFlip(0.12)) {
    const fakeRef = `<${randHex(12)}@${domain}>`
    pool.push(['References', fakeRef])
    if (coinFlip(0.7)) {
      pool.push(['In-Reply-To', fakeRef])
    }
  }
  
  // X-Mailman-Version
  if (coinFlip(0.05)) {
    pool.push(['X-Mailman-Version', `${randInt(2, 3)}.${randInt(0, 3)}.${randInt(0, 8)}`])
  }
  
  // Disposition-Notification-To (read receipt)
  if (coinFlip(0.05)) {
    pool.push(['Disposition-Notification-To', fromEmail])
  }
  
  // X-Confirm-Reading-To
  if (coinFlip(0.03)) {
    pool.push(['X-Confirm-Reading-To', fromEmail])
  }
  
  // Reply-To (sometimes same, sometimes different format)
  if (coinFlip(0.3)) {
    const formats = [
      fromEmail,
      `<${fromEmail}>`,
      `"${faker.person.fullName()}" <${fromEmail}>`
    ]
    pool.push(['Reply-To', pickRandom(formats)])
  }
  
  return pool
}

// ---------- List-Unsubscribe Variations ----------

function generateUnsubscribeHeaders(domain, toEmail) {
  const headers = []
  
  // 60% chance to include unsubscribe headers
  if (!coinFlip(0.6)) return headers
  
  const token = crypto.createHmac('sha256', randHex(8)).update(toEmail || 'x').digest('hex').slice(0, 32)
  
  const urlFormats = [
    `https://${domain}/unsubscribe?t=${token}`,
    `https://${domain}/optout/${token}`,
    `https://${domain}/u/${token.slice(0, 16)}`,
    `https://mail.${domain}/unsub?id=${token}`,
    `https://${domain}/email/unsubscribe/${token}`
  ]
  
  const mailtoFormats = [
    `mailto:unsubscribe@${domain}?subject=Unsubscribe`,
    `mailto:unsub@${domain}?subject=Remove`,
    `mailto:stop@${domain}`,
    `mailto:optout@${domain}?subject=Optout-${token.slice(0, 8)}`
  ]
  
  const format = randInt(1, 4)
  
  switch(format) {
    case 1: // URL only
      headers.push(['List-Unsubscribe', `<${pickRandom(urlFormats)}>`])
      break
    case 2: // Mailto only
      headers.push(['List-Unsubscribe', `<${pickRandom(mailtoFormats)}>`])
      break
    case 3: // Both
      headers.push(['List-Unsubscribe', `<${pickRandom(urlFormats)}>, <${pickRandom(mailtoFormats)}>`])
      break
    case 4: // Both + One-Click
      headers.push(['List-Unsubscribe', `<${pickRandom(urlFormats)}>, <${pickRandom(mailtoFormats)}>`])
      headers.push(['List-Unsubscribe-Post', 'List-Unsubscribe=One-Click'])
      break
  }
  
  return headers
}

// ---------- Main Polymorphic Header Generator ----------

function generateHeaders(fromEmail, toEmail) {
  const domain = parseDomain(fromEmail)
  const headers = new Map()
  
  // 1. Message-ID (Always required, but format varies)
  headers.set('Message-ID', generateMessageId(domain))
  
  // 2. Return-Path (Usually present)
  if (coinFlip(0.85)) {
    headers.set('Return-Path', `<${fromEmail}>`)
  }
  
  // 3. MIME-Version (Almost always, slight variation)
  if (coinFlip(0.95)) {
    headers.set('MIME-Version', '1.0')
  }
  
  // 4. X-Mailer OR User-Agent (not both usually)
  const mailerChoice = randInt(1, 4)
  if (mailerChoice === 1) {
    const mailer = generateMailClient()
    if (mailer) headers.set('X-Mailer', mailer)
  } else if (mailerChoice === 2) {
    const ua = generateUserAgent()
    if (ua) headers.set('User-Agent', ua)
  } else if (mailerChoice === 3) {
    // Both (rare)
    const mailer = generateMailClient()
    const ua = generateUserAgent()
    if (mailer) headers.set('X-Mailer', mailer)
    if (ua) headers.set('User-Agent', ua)
  }
  // mailerChoice === 4: neither (webmail style)
  
  // 5. Errors-To (sometimes)
  if (coinFlip(0.4)) {
    headers.set('Errors-To', fromEmail)
  }
  
  // 6. Unsubscribe headers (variable)
  const unsubHeaders = generateUnsubscribeHeaders(domain, toEmail)
  unsubHeaders.forEach(([k, v]) => headers.set(k, v))
  
  // 7. Random optional headers
  const optionalHeaders = generateOptionalHeaders(domain, fromEmail, toEmail)
  // Pick random subset
  const numOptional = randInt(0, Math.min(5, optionalHeaders.length))
  const shuffled = shuffleArray(optionalHeaders).slice(0, numOptional)
  shuffled.forEach(([k, v]) => headers.set(k, v))
  
  // 8. Custom tracking (varied names to avoid pattern)
  if (coinFlip(0.5)) {
    const trackNames = ['X-Track', 'X-Msg-ID', 'X-Ref', 'X-UID', 'X-ID', 'X-Tag', 'X-Session']
    const trackFormats = [
      () => randHex(4).toUpperCase(),
      () => randHex(8),
      () => `${randInt(100000, 999999)}`,
      () => crypto.randomUUID().split('-')[0],
      () => `${Date.now().toString(36)}`
    ]
    headers.set(pickRandom(trackNames), pickRandom(trackFormats)())
  }
  
  return headers
}

// ---------- Randomized Header Order ----------

function getRandomHeaderOrder(headerKeys) {
  // Core headers that should be near top (but still shuffleable)
  const coreHeaders = ['Return-Path', 'MIME-Version', 'Message-ID']
  const core = headerKeys.filter(k => coreHeaders.includes(k))
  const rest = headerKeys.filter(k => !coreHeaders.includes(k))
  
  // Shuffle core slightly, shuffle rest completely
  return [...shuffleArray(core), ...shuffleArray(rest)]
}

// ---------- Haraka Plugin Exports ----------

exports.register = function () {
  this.loginfo('Polymorphic Header Generator loaded')
}

exports.hook_data_post = function (next, connection) {
  const plugin = this
  const txn = connection.transaction
  if (!txn) return next()

  try {
    const fromAddr = txn.mail_from?.address ? txn.mail_from.address() : null
    const toAddr = txn.rcpt_to?.[0]?.address ? txn.rcpt_to[0].address() : null

    if (!fromAddr) return next()

    // 1. Scrub ALL existing headers that could create patterns
    const toRemove = [
      'Return-Path', 'Message-ID', 'X-Mailer', 'User-Agent', 
      'List-Unsubscribe', 'List-Unsubscribe-Post',
      'Feedback-ID', 'Errors-To', 'MIME-Version',
      'Precedence', 'Auto-Submitted', 'X-Priority', 'X-MSMail-Priority',
      'X-Originating-IP', 'X-PVIQ', 'X-Xyz-cr', 'X-Xyz-cn',
      'X-TBot-Campaign', 'X-TBot-Worker', 'X-Sys-Campaign',
      'Importance', 'Organization', 'X-MimeOLE', 'X-Spam-Status',
      'Thread-Topic', 'X-Auto-Response-Suppress', 'Accept-Language',
      'Content-Language', 'X-MS-Has-Attach', 'X-MS-TNEF-Correlator',
      'References', 'In-Reply-To', 'X-Mailman-Version',
      'Disposition-Notification-To', 'X-Confirm-Reading-To', 'Reply-To',
      'X-Track', 'X-Msg-ID', 'X-Ref', 'X-UID', 'X-ID', 'X-Tag', 'X-Session', 'X-Jp-Track'
    ]
    
    // Wildcard removal for identifying headers
    const headerLines = txn.header.header_list
    headerLines.forEach(h => {
        const lower = h.toLowerCase()
        if (lower.startsWith('x-xyz-') || lower.startsWith('x-cm-') || 
            lower.startsWith('x-virtual-') || lower.startsWith('x-ms-') ||
            lower.startsWith('x-google-') || lower.startsWith('x-gm-')) {
            txn.remove_header(h.split(':')[0])
        }
    })

    toRemove.forEach(h => {
      while (txn.header.get(h)) txn.remove_header(h)
    })

    // 2. Generate Polymorphic Headers (each email is unique)
    const newHeaders = generateHeaders(fromAddr, toAddr)

    // 3. Apply in randomized order
    const headerKeys = Array.from(newHeaders.keys())
    const randomOrder = getRandomHeaderOrder(headerKeys)
    
    for (const key of randomOrder) {
      if (newHeaders.has(key)) {
        txn.add_header(key, newHeaders.get(key))
      }
    }

    // LOGGING for JP carriers
    if (toAddr && (toAddr.includes('docomo.ne.jp') || toAddr.includes('ezweb.ne.jp') || toAddr.includes('softbank.ne.jp'))) {
      connection.loginfo(plugin, `[JP-Mobile] Sending to ${toAddr}. Ensure Max_Concurrency=1.`)
    }

    next()
  } catch (err) {
    connection.logerror(plugin, `Header gen error: ${err.message}`)
    next()
  }
}
