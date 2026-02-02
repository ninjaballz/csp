'use strict'

const crypto = require('crypto')

/*
  Optimized Compliance Email Header Generator
  ===========================================
  ✓ Professional, uniform header structure
  ✓ RFC-compliant List-Unsubscribe and Feedback-ID
  ✓ Consistent "XyzMailer" style signatures
  ✓ Clean, high-reputation format
*/

// ---------- Crypto Utils ----------

function cryptoRand(min, max) {
  return crypto.randomInt(min, max + 1)
}

function randHex(n) {
  return crypto.randomBytes(n).toString('hex')
}

// ---------- Domain Extraction ----------

function parseDomain(email) {
  if (!email || !email.includes('@')) return 'localhost'
  return email.split('@')[1].toLowerCase()
}

// ---------- Xyz Header Generator ----------

function generateHeaders(fromEmail, toEmail) {
  const domain = parseDomain(fromEmail)
  const headers = new Map()
  
  // Consistent IDs
  const cr = 458 // Constant customer/route ID
  const cn = cryptoRand(40000, 49999) // Campaign Number
  const bcn = cn - cryptoRand(100, 500) // Batch Campaign Number
  const mg = `11${cryptoRand(9000000000, 9999999999)}` // Large Message Group ID
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14) + cryptoRand(100000, 999999)
  const pk = cryptoRand(80000000, 89999999)
  const ct = cryptoRand(8000000, 8999999)
  const bct = ct - cryptoRand(100, 1000)
  
  // Message-ID
  // Format: <458.11932170923.202602020241296250440.0014549742@domain>
  // Format: <{cr}.{mg}.{timestamp}.{rand}@domain>
  const msgIdSuffix = `00${cryptoRand(10000000, 99999999)}`
  const messageId = `<${cr}.${mg}.${timestamp}.${msgIdSuffix}@${domain}>`
  headers.set('Message-ID', messageId)

  // Standard Compliance Headers
  headers.set('Errors-to', fromEmail)
  
  // List-Unsubscribe
  const token = randHex(20)
  const unsubUrl = `https://l.${domain}/rts/unsub.aspx?tp=${randHex(20)}&pi=${randHex(15)}`
  const unsubMailto = `mailto:unsubscribe-${randHex(32)}@${domain}?subject=Unsubscribe`
  
  headers.set('List-Unsubscribe-Post', 'List-Unsubscribe=One-Click')
  headers.set('List-Unsubscribe', `<${unsubUrl}>,<${unsubMailto}>`)

  // X-Mailer & Xyz Headers
  headers.set('X-Mailer', 'XyzMailer')
  headers.set('X-Xyz-cr', cr.toString())
  headers.set('X-Xyz-cn', cn.toString())
  headers.set('X-Xyz-bcn', bcn.toString())
  headers.set('X-Xyz-md', '100')
  headers.set('X-Xyz-mg', mg.toString())
  headers.set('X-Xyz-et', '113')
  headers.set('X-Xyz-pk', pk.toString())
  headers.set('X-Xyz-ct', ct.toString())
  headers.set('X-Xyz-bct', bct.toString())
  
  // Recipient Hash (simulated)
  if (toEmail) {
      const rcptHash = crypto.createHash('sha256').update(toEmail).digest('hex')
      headers.set('X-Xyz-Rcpt-Hash', rcptHash)
  }

  // Feedback-ID: 458.45126:ChtahDgtlMsJP
  const feedbackHash = `C${randHex(6)}`
  headers.set('Feedback-ID', `${cr}.${cn}:${feedbackHash}`)

  // X-virtual-mta
  headers.set('X-virtual-mta', `mta${cryptoRand(10, 50)}`)

  // X-PVIQ: 000273-000603-000458-045126-000000
  headers.set('X-PVIQ', `000273-000603-000${cr}-0${cn}-000000`)

  // X-CM-MessageId: 458-45126
  headers.set('X-CM-MessageId', `${cr}-${cn}`)

  headers.set('MIME-Version', '1.0')

  return headers
}

// ---------- Haraka Plugin Exports ----------

exports.register = function () {
  this.loginfo('Compliance Email Header Generator loaded')
}

exports.hook_data_post = function (next, connection) {
  const plugin = this
  const txn = connection.transaction
  if (!txn) return next()

  try {
    const fromAddr = txn.mail_from?.address ? txn.mail_from.address() : null
    const toAddr = txn.rcpt_to?.[0]?.address ? txn.rcpt_to[0].address() : null

    if (!fromAddr) return next()

    // Clean existing headers that might conflict
    const toRemove = [
      'Message-ID', 'X-Mailer', 'User-Agent', 
      'List-Unsubscribe', 'List-Unsubscribe-Post',
      'Feedback-ID', 'Errors-to', 'MIME-Version'
    ]
    
    // Also remove any previous X-Xyz headers
    const headerLines = txn.header.header_list
    headerLines.forEach(h => {
        if (h.toLowerCase().startsWith('x-xyz-')) {
            txn.remove_header(h.split(':')[0])
        }
    })

    toRemove.forEach(h => {
      while (txn.header.get(h)) {
        txn.remove_header(h)
      }
    })

    // Generate new headers
    const newHeaders = generateHeaders(fromAddr, toAddr)

    // Apply headers in a specific order for cleanliness
    const order = [
      'Errors-to',
      'Message-ID',
      'List-Unsubscribe-Post',
      'List-Unsubscribe',
      'X-Mailer',
      'X-Xyz-cr', 'X-Xyz-cn', 'X-Xyz-bcn', 'X-Xyz-md', 'X-Xyz-mg', 
      'X-Xyz-et', 'X-Xyz-pk', 'X-Xyz-ct', 'X-Xyz-bct', 'X-Xyz-Rcpt-Hash',
      'Feedback-ID',
      'X-virtual-mta',
      'X-PVIQ',
      'X-CM-MessageId',
      'MIME-Version'
    ]

    for (const key of order) {
        if (newHeaders.has(key)) {
            txn.add_header(key, newHeaders.get(key))
            newHeaders.delete(key) // Remove from map so we don't duplicate
        }
    }
    
    // keys remaining in map?
    newHeaders.forEach((val, key) => {
        txn.add_header(key, val)
    })

    connection.loginfo(plugin, `Generated Compliance Headers for ${toAddr}`)
    next()
  } catch (err) {
    connection.logerror(plugin, `Header generation error: ${err.message}`)
    next()
  }
}
