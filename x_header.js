'use strict';

const crypto = require('crypto');

/*
  Amazon SES-Style Email Header Generator with Spam Compliance
  -------------------------------------------------------------
  Generates realistic Amazon SES headers with random values + spam compliance headers
  - X-AMAZON-MAIL-RELAY-TYPE
  - Bounces-to
  - X-AMAZON-METADATA
  - X-Original-MessageID
  - Feedback-ID
  - X-SES-Outgoing (with current date + random Amazon IP)
  
  Spam Compliance:
  - List-Unsubscribe (URL + mailto)
  - List-Unsubscribe-Post
  - Precedence
  - X-Mailer / User-Agent (100+ combinations)
  - X-Priority
  - Auto-Submitted
*/

// Real Amazon IP CIDR blocks
const AMAZON_IP_RANGES = [
  "3.4.12.4/32", "3.5.140.0/22", "15.190.244.0/22", "15.230.15.29/32", "15.230.15.76/31",
  "15.230.221.0/24", "15.248.168.0/21", "23.254.120.0/21", "35.180.0.0/16", "51.85.0.0/16",
  "52.93.153.170/32", "52.93.178.234/32", "52.93.244.0/24", "52.94.76.0/22", "52.95.36.0/22",
  "52.219.170.0/23", "99.87.32.0/22", "120.52.22.96/27", "150.222.47.64/26", "150.222.81.0/24",
  "150.222.234.54/31", "3.2.75.0/24", "15.230.39.60/31", "15.230.102.0/24", "15.230.113.0/24",
  "35.111.254.0/24", "51.168.0.0/15", "52.93.22.48/28", "52.94.152.9/32", "52.219.168.0/24",
  "150.222.53.160/27", "150.222.78.0/24", "216.244.32.0/22", "3.2.58.0/24", "3.108.0.0/14",
  "15.181.232.0/21", "15.230.39.208/31", "16.12.80.0/24", "18.99.176.0/20", "35.50.192.0/24",
  "52.93.17.0/24", "52.93.45.0/25", "52.93.127.163/32", "52.93.199.31/32", "52.95.150.0/24",
  "52.219.60.0/23", "150.222.43.0/26", "216.244.7.0/24", "3.2.0.0/24", "3.5.60.0/22",
  "13.248.56.0/22", "13.248.117.0/24", "15.221.34.0/24", "15.230.137.0/24", "15.230.177.0/24",
  "18.97.192.0/18", "31.220.235.0/24", "52.93.84.195/32", "52.93.126.135/32", "52.93.178.219/32",
  "52.93.199.90/32", "52.94.24.0/23", "96.0.80.0/22", "150.222.199.0/25", "150.222.252.248/31",
  "15.190.32.0/20", "15.230.39.44/31", "15.230.110.0/24", "15.230.216.8/32", "18.97.0.0/18",
  "43.249.45.0/24", "52.4.0.0/14", "52.93.100.0/23", "52.93.127.27/32", "52.93.228.193/32",
  "52.144.227.192/26", "52.144.229.64/26", "54.222.88.0/24", "64.252.81.0/24", "96.0.102.0/23",
  "3.4.15.168/29", "13.248.70.0/24", "15.230.15.104/31", "15.230.15.162/31", "15.230.73.192/26",
  "16.12.44.0/24", "18.96.32.0/19", "35.96.248.0/24", "50.16.0.0/15", "52.93.127.133/32",
  "52.93.198.0/25", "52.95.208.0/22", "52.95.224.0/24", "54.222.64.0/24", "99.151.160.0/21",
  "104.255.59.104/32", "104.255.59.114/32", "139.56.16.0/23", "150.222.14.0/24", "150.222.84.0/24",
  "150.222.234.50/31", "205.251.249.0/24", "15.193.3.0/24", "15.220.196.0/22", "15.220.216.0/22",
  "15.230.15.48/31", "18.96.160.0/19", "35.71.115.0/24", "52.93.22.64/29", "52.93.127.169/32",
  "52.93.153.148/32", "52.94.244.0/22", "52.119.208.0/23", "54.240.236.26/32", "136.18.152.0/21",
  "150.222.228.0/24", "150.222.238.0/24", "161.188.116.0/22", "192.31.212.0/24", "15.197.34.0/23",
  "15.205.0.0/16", "15.230.39.10/31", "15.230.254.2/31", "16.12.6.0/23", "35.56.0.0/15",
  "52.82.169.16/28", "52.93.90.193/32", "52.94.198.16/28", "52.144.225.128/26", "64.252.69.0/24",
  "71.131.192.0/18", "104.255.59.208/32", "150.222.144.98/32", "216.244.40.0/21", "13.236.0.0/14",
  "15.103.0.0/16", "15.177.100.0/24", "15.197.36.0/22", "15.230.15.178/31", "15.230.15.188/31",
  "15.230.158.0/23", "16.12.32.0/22", "35.96.28.0/23", "35.96.240.0/24", "43.206.0.0/15",
  "52.46.220.0/22", "52.93.56.0/24", "52.93.178.152/32", "52.95.41.0/24", "52.95.100.0/22",
  "52.95.226.0/24", "52.219.204.0/22", "77.112.0.0/14", "99.78.152.0/22", "150.222.135.0/24",
  "150.222.160.34/32", "150.222.202.0/24", "150.247.37.0/24", "151.148.16.10/31", "3.4.0.0/24",
  "3.4.12.35/32", "3.4.12.36/32", "15.177.83.0/24", "15.185.0.0/16", "15.220.252.0/22",
  "15.221.35.0/24", "15.230.39.28/31", "15.248.28.0/22", "16.30.0.0/16", "16.49.0.0/16",
  "18.96.192.0/19", "35.54.58.0/24", "35.55.17.0/24", "40.167.0.0/16", "52.93.127.118/32",
  "52.93.178.205/32", "52.94.26.0/23", "52.94.152.44/32", "52.95.182.0/23", "54.240.236.54/32",
  "54.247.0.0/16", "54.248.0.0/15", "56.128.0.0/16", "150.222.52.224/27", "3.4.12.39/32",
  "3.4.15.48/29", "13.248.72.0/24", "15.230.4.129/32", "15.230.39.196/31", "15.251.0.9/32",
  "35.71.99.0/24", "51.46.0.0/15", "52.119.252.0/22", "52.219.212.0/22", "54.148.0.0/15",
  "69.107.7.16/29", "99.77.130.0/24", "150.222.234.52/31", "150.222.234.68/31", "180.163.57.128/26",
  "15.193.11.0/24", "15.230.68.192/26", "18.200.0.0/16", "52.93.19.0/24", "52.93.52.167/32",
  "52.93.91.102/32", "52.93.152.197/32", "54.206.0.0/16", "54.240.236.69/32", "66.7.0.0/21",
  "69.107.10.80/29", "99.150.56.0/21", "108.175.56.0/22", "150.222.44.192/26", "150.222.48.128/27",
  "150.222.52.32/27", "150.222.54.192/27", "150.222.96.0/24", "150.247.33.0/24", "3.5.92.0/23",
  "5.60.0.0/20", "13.248.124.0/24", "15.193.2.0/24", "15.220.222.0/23", "15.230.67.64/26",
  "15.230.212.0/23", "16.22.0.0/16", "23.228.193.0/24", "35.50.238.0/24", "52.93.40.0/24",
  "52.93.178.136/32", "52.93.199.89/32", "52.219.192.0/23", "99.77.132.0/24", "104.255.59.82/32",
  "150.222.38.0/26", "150.247.34.0/24", "3.4.12.41/32", "13.204.0.0/14", "15.181.247.0/24",
  "15.230.200.0/24", "16.12.24.0/21", "18.232.0.0/14", "35.55.11.0/24", "40.186.0.0/16",
  "51.34.0.0/16", "52.82.169.0/28", "52.93.79.0/24", "52.93.112.0/24", "52.93.178.138/32",
  "54.239.0.224/28", "54.239.48.0/22", "56.242.0.0/16", "64.252.118.0/24", "76.223.170.112/28",
  "99.77.244.0/24", "99.181.64.0/18", "108.166.244.48/32", "141.231.0.0/16", "150.222.24.71/32",
  "155.146.80.0/20", "5.60.64.0/19", "13.248.119.0/24", "15.220.120.0/21", "15.230.4.16/32",
  "15.230.39.254/31", "15.230.179.16/29", "35.54.51.0/24", "52.93.81.0/24", "52.93.199.42/32",
  "54.74.0.0/15", "69.107.9.184/29", "108.166.244.12/32", "150.222.15.124/32", "150.222.48.192/27",
  "150.222.50.32/27", "150.222.53.192/27", "150.222.114.0/24", "150.222.242.214/31", "15.220.207.0/24",
  "15.230.15.25/32", "15.230.15.94/31", "15.230.39.206/31", "15.230.39.244/31", "15.230.103.0/24",
  "15.230.216.2/31", "18.99.144.0/20", "18.102.0.0/16", "32.236.0.0/15", "40.172.0.0/16",
  "40.178.0.0/15", "43.193.0.0/18", "52.83.0.0/16", "52.94.6.0/24", "52.144.197.192/26",
  "64.252.122.0/24", "69.107.7.56/29", "150.222.2.0/24", "150.222.164.220/31", "155.146.224.0/20",
  "13.248.67.0/24", "15.230.138.0/24", "15.230.169.6/31", "52.47.0.0/16", "52.93.16.0/24",
  "52.93.84.192/32", "52.94.152.184/32", "52.94.249.144/28", "52.94.250.96/28", "52.95.136.0/23",
  "52.95.255.64/28", "52.144.199.128/26", "52.144.225.64/26", "52.219.143.0/24", "54.240.236.22/32",
  "104.255.59.201/32", "150.222.51.160/27", "151.148.40.0/24", "159.248.224.0/21", "204.246.168.0/22",
  "3.4.12.1/32"
];

// X-Mailer / User-Agent - 100+ combinations
const MAILER_AGENTS = [
  // Amazon services
  'Amazon SES',
  'Amazon Simple Email Service',
  'AmazonSES',
  'Amazon WorkMail',
  'Amazon Pinpoint',
  
  // AWS SDKs
  'aws-sdk-nodejs',
  'aws-sdk-php',
  'aws-sdk-python',
  'aws-sdk-ruby',
  'aws-sdk-java',
  'aws-sdk-go',
  'AWS SDK for JavaScript',
  'AWS SDK for Python/Boto3',
  'AWS SDK for .NET',
  
  // Thunderbird variations
  'Mozilla Thunderbird',
  'Thunderbird',
  'Mozilla/5.0 Thunderbird/91.0',
  'Mozilla/5.0 Thunderbird/102.0',
  'Mozilla/5.0 Thunderbird/115.0',
  'Thunderbird/91.13.0',
  'Thunderbird/102.15.1',
  
  // Outlook variations
  'Microsoft Outlook',
  'Microsoft Office Outlook',
  'Outlook',
  'Microsoft Outlook 16.0',
  'Microsoft Outlook 15.0',
  'Outlook-Desktop/16.0',
  'Outlook Express',
  
  // Apple Mail
  'Apple Mail',
  'Mail/16.0',
  'Apple Mail (2.3569.0.0)',
  'Darwin Mail',
  'iOS Mail',
  
  // Gmail & Google
  'Gmail',
  'Google Mail',
  'Gmail API',
  'Google Workspace',
  
  // Yahoo
  'Yahoo! Mail',
  'Yahoo Mail',
  'YahooMailClassic',
  'YahooMailApp',
  
  // ProtonMail
  'ProtonMail',
  'Proton Mail',
  'ProtonMail Bridge',
  
  // Other popular clients
  'Mailbird',
  'eM Client',
  'The Bat!',
  'Postbox',
  'Vivaldi Mail',
  'Evolution',
  'Claws Mail',
  'Sylpheed',
  'KMail',
  'Mutt',
  'Alpine',
  'Pine',
  'MailMate',
  'Spark',
  'Airmail',
  'Newton Mail',
  'Canary Mail',
  'Superhuman',
  'Hey',
  'Fastmail',
  
  // Mobile clients
  'K-9 Mail',
  'BlueMail',
  'TypeApp',
  'FairEmail',
  'Edison Mail',
  'Spike',
  'myMail',
  
  // Webmail
  'Roundcube',
  'SquirrelMail',
  'Horde',
  'RainLoop',
  'Zimbra',
  'SOGo',
  
  // Enterprise/Corporate
  'IBM Notes',
  'Lotus Notes',
  'Novell GroupWise',
  'Exchange Server',
  'Microsoft Exchange',
  
  // Marketing platforms
  'Mailchimp',
  'SendGrid',
  'Mailgun',
  'SparkPost',
  'Postmark',
  'Sendinblue',
  'Campaign Monitor',
  'Constant Contact',
  'AWeber',
  'GetResponse',
  'ConvertKit',
  'ActiveCampaign',
  'Drip',
  'HubSpot',
  'Marketo',
  'Salesforce Marketing Cloud',
  
  // Programming languages/frameworks
  'PHPMailer',
  'SwiftMailer',
  'Nodemailer',
  'ActionMailer',
  'Django Mail',
  'Laravel Mail',
  'Spring Mail',
  'JavaMail',
  '.NET Mail',
  'Python smtplib',
  
  // CMS/Platforms
  'WordPress',
  'Drupal',
  'Joomla',
  'Magento',
  'PrestaShop',
  'WooCommerce',
  'Shopify',
  
  // Sometimes no header
  null,
  null,
  null
];

// -------- HELPERS ----------

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomHex(length) {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

function randomAlphaNum(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[randomInt(0, chars.length - 1)];
  }
  return result;
}

function randomBase64(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[randomInt(0, chars.length - 1)];
  }
  return result;
}

function parseCIDR(cidr) {
  const [ipStr, maskStr] = cidr.split('/');
  const mask = parseInt(maskStr);
  const ipParts = ipStr.split('.').map(Number);
  
  // Convert IP to 32-bit integer
  const ipInt = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
  
  // Calculate the number of available IPs in this range
  const hostBits = 32 - mask;
  const numIPs = Math.pow(2, hostBits);
  
  return { ipInt, numIPs, mask };
}

function intToIP(int) {
  return [
    (int >>> 24) & 0xFF,
    (int >>> 16) & 0xFF,
    (int >>> 8) & 0xFF,
    int & 0xFF
  ].join('.');
}

function generateAmazonIP() {
  // Pick a random CIDR block
  const cidr = AMAZON_IP_RANGES[randomInt(0, AMAZON_IP_RANGES.length - 1)];
  const { ipInt, numIPs, mask } = parseCIDR(cidr);
  
  // For /32 blocks (single IP), just use that IP
  if (numIPs === 1) {
    return intToIP(ipInt);
  }
  
  // For other blocks, pick a random IP within the range
  // Skip first (network) and last (broadcast) for larger ranges
  let offset;
  if (numIPs > 2) {
    offset = randomInt(1, numIPs - 2);
  } else {
    offset = randomInt(0, numIPs - 1);
  }
  
  return intToIP(ipInt + offset);
}

function getCurrentDateFormatted() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

function generateTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

function generateMessageID() {
  const timestamp = generateTimestamp();
  const randomPart = randomHex(32);
  const unixTime = Date.now();
  return `<urn.rtn.msg.${timestamp}${randomPart}@${unixTime}.>`;
}

function generateBouncesTo(domain) {
  const timestamp = generateTimestamp();
  const randomPart = randomHex(32);
  const code = randomAlphaNum(17).toUpperCase();
  return `${timestamp}${randomPart}-${code}@${domain}`;
}

function generateMetadata() {
  return `CA=${randomAlphaNum(17).toUpperCase()}`;
}

function generateFeedbackID() {
  const num1 = randomInt(100000, 999999);
  const regions = ['us-west-2', 'us-east-1', 'us-east-2', 'eu-west-1', 'eu-west-2', 'eu-west-3', 
                  'eu-central-1', 'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 
                  'ap-northeast-2', 'ap-south-1', 'sa-east-1', 'ca-central-1'];
  const region = regions[randomInt(0, regions.length - 1)];
  const hash = randomBase64(43);
  return `${num1}::1.${region}.${hash}:AmazonSES`;
}

function generateUnsubToken(email, secret) {
  const ts = Date.now();
  const payload = `${email}|${ts}`;
  const sig = crypto.createHmac('sha256', secret)
    .update(payload)
    .digest('base64url')
    .slice(0, 32);
  return Buffer.from(`${payload}|${sig}`).toString('base64url');
}

function deriveUnsubHost(fromAddress) {
  if (!fromAddress || !fromAddress.includes('@')) {
    return 'example.com';
  }
  return fromAddress.split('@')[1].toLowerCase();
}

function buildConfig(fromAddress, toAddress) {
  const domain = deriveUnsubHost(fromAddress);
  const unsubSecret = process.env.UNSUB_SECRET || 'CHANGE_THIS_SECRET_KEY';
  
  return {
    // Amazon SES headers
    relayType: 'notification',
    bouncesTo: generateBouncesTo(domain),
    metadata: generateMetadata(),
    messageID: generateMessageID(),
    feedbackID: generateFeedbackID(),
    sesOutgoing: `${getCurrentDateFormatted()}-${generateAmazonIP()}`,
    
    // Spam compliance
    domain: domain,
    toAddress: toAddress,
    unsubToken: toAddress ? generateUnsubToken(toAddress, unsubSecret) : null,
    addPrecedence: Math.random() > 0.3, // 70% chance
    addPriority: Math.random() > 0.6,   // 40% chance
    addAutoSubmitted: Math.random() > 0.7 // 30% chance
  };
}

  
  // Add Amazon SES headers
  txn.add_header('X-AMAZON-MAIL-RELAY-TYPE', config.relayType);
  txn.add_header('Bounces-to', config.bouncesTo);
  txn.add_header('X-AMAZON-METADATA', config.metadata);
  txn.add_header('X-Original-MessageID', config.messageID);
  txn.add_header('Feedback-ID', config.feedbackID);
  txn.add_header('X-SES-Outgoing', config.sesOutgoing);
  
  // Add spam compliance headers
  
  // List-Unsubscribe (RFC 2369)
  if (config.unsubToken && config.domain) {
    const unsubUrl = `https://${config.domain}/unsubscribe/${config.unsubToken}`;
    const unsubMailto = `mailto:unsubscribe@${config.domain}?subject=unsubscribe`;
    
    // Random format: URL only, mailto only, or both
    const format = randomInt(1, 3);
    if (format === 1) {
      txn.add_header('List-Unsubscribe', `<${unsubUrl}>`);
    } else if (format === 2) {
      txn.add_header('List-Unsubscribe', `<${unsubMailto}>`);
    } else {
      txn.add_header('List-Unsubscribe', `<${unsubUrl}>, <${unsubMailto}>`);
    }
    
    // List-Unsubscribe-Post (RFC 8058 - One-Click)
    txn.add_header('List-Unsubscribe-Post', 'List-Unsubscribe=One-Click');
  }
  
  // Precedence (bulk mail indicator)
  if (config.addPrecedence) {
    const precedence = ['bulk', 'list'][randomInt(0, 1)];
    txn.add_header('Precedence', precedence);
  }
  
  
  // X-Priority (3 = Normal, 5 = Lowest for bulk)
  if (config.addPriority) {
    const priorities = ['3', '3 (Normal)', '5', '5 (Lowest)'];
    txn.add_header('X-Priority', priorities[randomInt(0, priorities.length - 1)]);
  }
  
  // Auto-Submitted (RFC 3834)
  if (config.addAutoSubmitted) {
    txn.add_header('Auto-Submitted', 'auto-generated');
  }
}

exports.register = function() {
  this.loginfo('Amazon SES-style header plugin with spam compliance loaded (100+ X-Mailer combinations)');
};

exports.hook_data_post = function(next, connection) {
  const plugin = this;
  const txn = connection.transaction;
  if (!txn) return next();
  
  try {
    const fromAddr = txn.mail_from && txn.mail_from.address && txn.mail_from.address();
    const rcptObj = txn.rcpt_to && txn.rcpt_to[0];
    const toAddr = rcptObj && rcptObj.address && rcptObj.address();
    
    const config = buildConfig(fromAddr, toAddr);
    addHeaders(txn, config);
    
    connection.loginfo(plugin, `ses-headers: relay=${config.relayType}, outgoing=${config.sesOutgoing}, mailer=${config.xMailer || 'none'}`);
    next();
  } catch (err) {
    connection.logerror(plugin, `error: ${err.message}`);
    next();
  }
};

exports._internal = {
  deriveUnsubHost,
  buildConfig,
  generateMessageID,
  generateBouncesTo,
  generateMetadata,
  generateFeedbackID,
  generateAmazonIP,
  getCurrentDateFormatted,
  parseCIDR,
  intToIP,
  generateUnsubToken
};
