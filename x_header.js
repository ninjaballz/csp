'use strict'

const crypto = require('crypto')
const { faker } = require('@faker-js/faker')

/*
  Polymorphic Header Generator - RFC Compliant
  =============================================
  ✓ All headers are RFC 5322 / RFC 2045 compliant
  ✓ Random inclusion/exclusion of optional headers
  ✓ Varied Message-ID formats mimicking different mail clients
  ✓ Randomized MIME boundary styles
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

function randAlphaNum(n) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < n; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// ---------- Domain Extraction ----------

function parseDomain(email) {
  if (!email || !email.includes('@')) return 'localhost'
  return email.split('@')[1].toLowerCase()
}

// ---------- Polymorphic MIME Boundary Generators (RFC 2046) ----------

function generateBoundary() {
  const styles = [
    // Apple Mail style
    () => `Apple-Mail=_${crypto.randomUUID().toUpperCase()}`,
    // Outlook style
    () => `----=_NextPart_${randInt(100, 999)}_${randInt(10000000, 99999999)}.${Date.now()}`,
    // Thunderbird style
    () => `------------${randHex(24)}`,
    // Gmail style
    () => `${randInt(1000000000, 9999999999).toString().padStart(10, '0')}${randInt(1000000000, 9999999999)}`,
    // PHP Mailer style
    () => `b1_${randHex(32)}`,
    // Postfix style
    () => `===============${randInt(1000000000, 9999999999)}==`,
    // Simple random
    () => `----${randAlphaNum(16)}`,
    // Mixed style
    () => `--boundary_${Date.now()}_${randHex(8)}`,
    // Sendmail style
    () => `${randInt(10000, 99999)}.${Date.now()}.${randInt(10000, 99999)}`,
    // Exchange style
    () => `_${randInt(100, 999)}_${randHex(8)}_${randInt(1000, 9999)}_`,
    // MIME-tools style
    () => `----------${randAlphaNum(20)}`,
    // Java Mail style
    () => `----=_Part_${randInt(0, 999)}_${randInt(100000000, 999999999)}.${Date.now()}`
  ]
  return pickRandom(styles)()
}

// ---------- Polymorphic Message-ID Generators (RFC 5322) ----------

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
    // Sendmail style
    () => {
      return `<${Date.now()}.${randAlphaNum(14)}@${domain}>`
    }
  ]
  return pickRandom(formats)()
}

// ---------- Polymorphic X-Mailer (Common Practice) ----------

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
    // Generic
    () => `${faker.company.name().replace(/[^a-zA-Z0-9 ]/g, '')} Mailer ${faker.system.semver()}`
  ]
  return pickRandom(clients)()
}

// ---------- User-Agent (RFC 5322 Comments) ----------

function generateUserAgent() {
  const agents = [
    () => `Mozilla/5.0 (Windows NT 10.0; Win64; x64) Gecko/${randInt(20100101, 20251231)} Thunderbird/${randInt(78, 115)}.${randInt(0, 12)}`,
    () => `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_${randInt(13, 15)}_${randInt(0, 7)}) AppleWebKit/${randInt(600, 650)}.${randInt(1, 9)}.${randInt(1, 20)}`,
    () => `Microsoft-MacOutlook/${randInt(16, 16)}.${randInt(50, 80)}.${randInt(21000000, 23999999)}`,
    () => null
  ]
  return pickRandom(agents)()
}

// ---------- RFC Compliant Optional Headers ----------

function generateOptionalHeaders(domain, fromEmail) {
  const pool = []
  
  // Organization (RFC 5322 - optional)
  if (coinFlip(0.2)) {
    pool.push(['Organization', faker.company.name()])
  }
  
  // Reply-To (RFC 5322)
  if (coinFlip(0.25)) {
    const formats = [
      fromEmail,
      `<${fromEmail}>`,
      `"${faker.person.fullName()}" <${fromEmail}>`
    ]
    pool.push(['Reply-To', pickRandom(formats)])
  }
  
  // Content-Language (RFC 3282)
  if (coinFlip(0.2)) {
    pool.push(['Content-Language', pickRandom(['ja', 'ja-JP', 'en', 'en-US', 'en-GB'])])
  }
  
  // In-Reply-To / References (RFC 5322 - fake thread for deliverability)
  if (coinFlip(0.1)) {
    const fakeRef = `<${randHex(12)}@${domain}>`
    pool.push(['References', fakeRef])
    if (coinFlip(0.6)) {
      pool.push(['In-Reply-To', fakeRef])
    }
  }
  
  // Disposition-Notification-To (RFC 3798 - read receipt)
  if (coinFlip(0.03)) {
    pool.push(['Disposition-Notification-To', `<${fromEmail}>`])
  }
  
  // Comments (RFC 5322)
  if (coinFlip(0.05)) {
    pool.push(['Comments', pickRandom([
      'Authenticated sender',
      'This message was sent securely',
      ''
    ])])
  }
  
  // Keywords (RFC 5322)
  if (coinFlip(0.05)) {
    pool.push(['Keywords', faker.lorem.words(randInt(1, 3))])
  }
  
  return pool
}

// ---------- List-Unsubscribe (RFC 2369 / RFC 8058) ----------

function generateUnsubscribeHeaders(domain, toEmail) {
  const headers = []
  
  // 50% chance to include
  if (!coinFlip(0.5)) return headers
  
  const token = crypto.createHmac('sha256', randHex(8)).update(toEmail || 'x').digest('hex').slice(0, 32)
  
  const urlFormats = [
    `https://${domain}/unsubscribe?t=${token}`,
    `https://${domain}/optout/${token}`,
    `https://${domain}/u/${token.slice(0, 16)}`
  ]
  
  const mailtoFormats = [
    `mailto:unsubscribe@${domain}?subject=Unsubscribe`,
    `mailto:unsub@${domain}?subject=Remove`,
    `mailto:optout@${domain}`
  ]
  
  const format = randInt(1, 4)
  
  switch(format) {
    case 1:
      headers.push(['List-Unsubscribe', `<${pickRandom(urlFormats)}>`])
      break
    case 2:
      headers.push(['List-Unsubscribe', `<${pickRandom(mailtoFormats)}>`])
      break
    case 3:
      headers.push(['List-Unsubscribe', `<${pickRandom(urlFormats)}>, <${pickRandom(mailtoFormats)}>`])
      break
    case 4:
      headers.push(['List-Unsubscribe', `<${pickRandom(urlFormats)}>, <${pickRandom(mailtoFormats)}>`])
      headers.push(['List-Unsubscribe-Post', 'List-Unsubscribe=One-Click'])
      break
  }
  
  return headers
}

// ---------- Main Header Generator ----------

function generateHeaders(fromEmail, toEmail) {
  const domain = parseDomain(fromEmail)
  const headers = new Map()
  
  // 1. Message-ID (RFC 5322 - required)
  headers.set('Message-ID', generateMessageId(domain))
  
  // 2. MIME-Version (RFC 2045)
  headers.set('MIME-Version', '1.0')
  
  // 3. X-Mailer OR User-Agent (common practice, not both)
  const mailerChoice = randInt(1, 4)
  if (mailerChoice === 1) {
    const mailer = generateMailClient()
    if (mailer) headers.set('X-Mailer', mailer)
  } else if (mailerChoice === 2) {
    const ua = generateUserAgent()
    if (ua) headers.set('User-Agent', ua)
  }
  // 3,4 = no mailer (webmail style)
  
  // 4. Unsubscribe headers (RFC 2369)
  const unsubHeaders = generateUnsubscribeHeaders(domain, toEmail)
  unsubHeaders.forEach(([k, v]) => headers.set(k, v))
  
  // 5. Optional RFC headers
  const optionalHeaders = generateOptionalHeaders(domain, fromEmail)
  const numOptional = randInt(0, Math.min(3, optionalHeaders.length))
  const shuffled = shuffleArray(optionalHeaders).slice(0, numOptional)
  shuffled.forEach(([k, v]) => headers.set(k, v))
  
  return headers
}

// ---------- Randomized Header Order ----------

function getRandomHeaderOrder(headerKeys) {
  const coreHeaders = ['MIME-Version', 'Message-ID']
  const core = headerKeys.filter(k => coreHeaders.includes(k))
  const rest = headerKeys.filter(k => !coreHeaders.includes(k))
  return [...shuffleArray(core), ...shuffleArray(rest)]
}

// ---------- Boundary Replacement in Content-Type ----------

function replaceBoundary(contentType) {
  if (!contentType || !contentType.includes('boundary')) return null
  
  const newBoundary = generateBoundary()
  // Extract old boundary
  const match = contentType.match(/boundary=["']?([^"';\s]+)["']?/i)
  if (!match) return null
  
  const oldBoundary = match[1]
  const newContentType = contentType.replace(
    /boundary=["']?[^"';\s]+["']?/i, 
    `boundary="${newBoundary}"`
  )
  
  return { oldBoundary, newBoundary, newContentType }
}

// ---------- Haraka Plugin Exports ----------

exports.register = function () {
  this.loginfo('Polymorphic Header Generator loaded (RFC Compliant)')
}

exports.hook_data_post = function (next, connection) {
  const plugin = this
  const txn = connection.transaction
  if (!txn) return next()

  try {
    const fromAddr = txn.mail_from?.address ? txn.mail_from.address() : null
    const toAddr = txn.rcpt_to?.[0]?.address ? txn.rcpt_to[0].address() : null

    if (!fromAddr) return next()

    // 1. Headers to regenerate (we remove then add our own)
    const toRemove = [
      'Message-ID', 'X-Mailer', 'User-Agent', 
      'List-Unsubscribe', 'List-Unsubscribe-Post',
      'Feedback-ID', 'MIME-Version',
      'Precedence', 'Auto-Submitted',
      'X-PVIQ', 'X-Xyz-cr', 'X-Xyz-cn',
      'X-TBot-Campaign', 'X-TBot-Worker', 'X-Sys-Campaign'
    ]
    
    // Wildcard removal for fingerprinting headers
    const headerLines = txn.header.header_list
    headerLines.forEach(h => {
        const lower = h.toLowerCase()
        if (lower.startsWith('x-xyz-') || lower.startsWith('x-cm-') || 
            lower.startsWith('x-virtual-') || lower.startsWith('x-gm-')) {
            txn.remove_header(h.split(':')[0])
        }
    })

    toRemove.forEach(h => {
      while (txn.header.get(h)) txn.remove_header(h)
    })

    // 2. Handle Content-Type boundary replacement
    const contentType = txn.header.get('Content-Type')
    if (contentType && contentType.includes('boundary')) {
      const result = replaceBoundary(contentType)
      if (result) {
        // Update Content-Type header with new boundary
        txn.remove_header('Content-Type')
        txn.add_header('Content-Type', result.newContentType)
        
        // Replace boundary in body
        if (txn.body && result.oldBoundary && result.newBoundary) {
          const oldBody = txn.body.toString()
          if (oldBody) {
            const newBody = oldBody.split(result.oldBoundary).join(result.newBoundary)
            txn.body = Buffer.from(newBody)
          }
        }
      }
    }

    // 3. Generate RFC-compliant headers
    const newHeaders = generateHeaders(fromAddr, toAddr)

    // 4. Apply in randomized order
    const headerKeys = Array.from(newHeaders.keys())
    const randomOrder = getRandomHeaderOrder(headerKeys)
    
    for (const key of randomOrder) {
      if (newHeaders.has(key)) {
        txn.add_header(key, newHeaders.get(key))
      }
    }

    next()
  } catch (err) {
    connection.logerror(plugin, `Header gen error: ${err.message}`)
    next()
  }
}
