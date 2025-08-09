const { Buffer } = require('buffer');
const crypto = require('crypto');

exports.register = function () {
    this.loginfo("🎨 HTML Optimizer loaded - Enhanced version");
};

exports.hook_data_post = function (next, connection) {
    const txn = connection.transaction;
    if (!txn) {
        connection.loginfo(this, '⚠️ No transaction object');
        return next();
    }

    try {
        connection.loginfo(this, '🔍 Processing email content...');
        
        // Check if we have a body
        if (!txn.body) {
            connection.loginfo(this, '⚠️ No body object');
            return next();
        }

        let htmlProcessed = false;
        let textProcessed = false;

        // Process all body parts
        if (txn.body.children && txn.body.children.length > 0) {
            connection.loginfo(this, `📋 Found ${txn.body.children.length} body parts`);
            
            for (let i = 0; i < txn.body.children.length; i++) {
                const part = txn.body.children[i];
                connection.loginfo(this, `📄 Part ${i}: ${part.ct}`);
                
                if (part.ct === 'text/html' || part.ct.includes('text/html')) {
                    let html = part.bodytext.toString();
                    connection.loginfo(this, `📝 Original HTML length: ${html.length}`);
                    
                    // Check if placeholder exists
                    if (html.includes('{{RECIPIENT_EMAIL_MASKED}}')) {
                        connection.loginfo(this, '✅ Found {{RECIPIENT_EMAIL_MASKED}} placeholder');
                    }
                    
                    // Apply all optimizations
                    html = optimizeHTML(html);
                    html = addAntiSpamElements(html);
                    html = randomizeElements(html);
                    html = encodeSpecialChars(html);
                    html = replaceRecipientPlaceholders(html, txn, connection);
                    html = addMicrodataStructure(html); // NEW
                    html = optimizeImages(html); // NEW
                    html = addAMPCompatibility(html); // NEW
                    
                    part.bodytext = Buffer.from(html);
                    htmlProcessed = true;
                    connection.loginfo(this, `✅ HTML processed, new length: ${html.length}`);
                }
                else if (part.ct === 'text/plain' || part.ct.includes('text/plain')) {
                    let text = part.bodytext.toString();
                    text = replaceRecipientPlaceholders(text, txn, connection);
                    text = optimizePlainText(text); // NEW
                    part.bodytext = Buffer.from(text);
                    textProcessed = true;
                    connection.loginfo(this, '✅ Plain text processed');
                }
            }
        }
        
        // Also check root body if no children
        if (!htmlProcessed && txn.body.bodytext) {
            let content = txn.body.bodytext.toString();
            if (content.includes('<html') || content.includes('<HTML')) {
                connection.loginfo(this, '📝 Processing root HTML body');
                content = optimizeHTML(content);
                content = addAntiSpamElements(content);
                content = randomizeElements(content);
                content = encodeSpecialChars(content);
                content = replaceRecipientPlaceholders(content, txn, connection);
                content = addMicrodataStructure(content);
                content = optimizeImages(content);
                content = addAMPCompatibility(content);
                txn.body.bodytext = Buffer.from(content);
                htmlProcessed = true;
            }
        }

        // Optimize headers
        optimizeHeaders(txn, connection);

        if (htmlProcessed || textProcessed) {
            connection.loginfo(this, '✅ Email optimization completed');
        } else {
            connection.loginfo(this, '⚠️ No HTML or text parts found to process');
        }
        
        next();
    } catch (err) {
        connection.logerror(this, `❌ HTML optimization error: ${err.message}`);
        connection.logerror(this, err.stack);
        next();
    }
};

// NEW: Add microdata for better email recognition
function addMicrodataStructure(html) {
    // Add schema.org microdata for emails
    const microdataWrapper = `<div itemscope itemtype="http://schema.org/EmailMessage">`;
    
    if (!html.includes('itemscope')) {
        html = html.replace(/<body[^>]*>/i, '$&\n' + microdataWrapper);
        html = html.replace(/<\/body>/i, '</div>\n</body>');
    }
    
    return html;
}

// NEW: Optimize images for better delivery
function optimizeImages(html) {
    // Add proper image attributes
    html = html.replace(/<img([^>]*)>/gi, (match, attrs) => {
        let newAttrs = attrs;
        
        // Add border="0" if not present
        if (!attrs.includes('border=')) {
            newAttrs += ' border="0"';
        }
        
        // Add style for responsiveness if not present
        if (!attrs.includes('style=')) {
            newAttrs += ' style="display:block;max-width:100%;height:auto;"';
        }
        
        // Add loading="lazy" for modern clients
        if (!attrs.includes('loading=')) {
            newAttrs += ' loading="lazy"';
        }
        
        return `<img${newAttrs}>`;
    });
    
    return html;
}

// NEW: Add AMP compatibility hints
function addAMPCompatibility(html) {
    // Add AMP boilerplate if not present
    if (!html.includes('amp4email')) {
        const ampHint = '<!-- amp4email compatible -->';
        html = html.replace(/<head[^>]*>/i, '$&\n' + ampHint);
    }
    
    return html;
}

// NEW: Optimize plain text version
function optimizePlainText(text) {
    // Add spacing for better readability
    text = text.replace(/([.!?])\s*([A-Z])/g, '$1\n\n$2');
    
    // Add separator for footer
    if (!text.includes('---')) {
        text = text.replace(/(配信停止|unsubscribe)/i, '\n---\n$1');
    }
    
    return text;
}

// ENHANCED: Mask recipient email with more options
function maskEmail(email, connection) {
    if (!email || typeof email !== 'string') return email;
    
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    
    const [localPart, domain] = parts;
    
    // Different masking strategies based on length
    let masked;
    
    if (localPart.length <= 2) {
        masked = `${localPart[0]}*@${domain}`;
    } else if (localPart.length <= 5) {
        // For short emails, keep first and last
        masked = `${localPart[0]}***${localPart[localPart.length-1]}@${domain}`;
    } else {
        // For longer emails, keep more characters
        const keepStart = Math.min(Math.ceil(localPart.length * 0.3), 4);
        const keepEnd = 1;
        const start = localPart.substring(0, keepStart);
        const end = localPart.substring(localPart.length - keepEnd);
        const maskLength = Math.min(localPart.length - keepStart - keepEnd, 5);
        masked = `${start}${'*'.repeat(maskLength)}${end}@${domain}`;
    }
    
    if (connection) connection.loginfo('test', `Masked: ${email} → ${masked}`);
    return masked;
}

// ENHANCED: Replace recipient placeholders with more options
function replaceRecipientPlaceholders(content, txn, connection) {
    // Get recipient email(s)
    const rcptTo = txn.rcpt_to;
    if (!rcptTo || rcptTo.length === 0) {
        connection.loginfo('test', '⚠️ No recipients found');
        return content;
    }
    
    // Use first recipient
    const recipientEmail = rcptTo[0].address();
    const maskedEmail = maskEmail(recipientEmail, connection);
    
    // Extract username from email
    const username = recipientEmail.split('@')[0];
    const maskedUsername = username.length > 3 ? 
        username.substring(0, 2) + '***' : username;
    
    connection.loginfo('test', `📧 Recipient: ${recipientEmail}`);
    
    // Replace various placeholders
    const replacements = {
        '{{RECIPIENT_EMAIL_MASKED}}': maskedEmail,
        '{{RECIPIENT_EMAIL}}': recipientEmail,
        '{{RECIPIENT_USERNAME}}': username,
        '{{RECIPIENT_USERNAME_MASKED}}': maskedUsername,
        '{{RECIPIENT_DOMAIN}}': recipientEmail.split('@')[1],
        '[[RECIPIENT_EMAIL_MASKED]]': maskedEmail,
        '[[RECIPIENT_EMAIL]]': recipientEmail,
    };
    
    let totalReplacements = 0;
    Object.entries(replacements).forEach(([placeholder, value]) => {
        const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        content = content.replace(regex, () => {
            totalReplacements++;
            return value;
        });
    });
    
    if (totalReplacements > 0) {
        connection.loginfo('test', `✅ Made ${totalReplacements} placeholder replacements`);
    }
    
    return content;
}

// ENHANCED: HTML optimization with more features
function optimizeHTML(html) {
    // 1. Add proper DOCTYPE if missing
    if (!html.match(/<!DOCTYPE/i)) {
        html = '<!DOCTYPE html>\n' + html;
    }

    // 2. Enhanced meta tags
    const metaTags = `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="format-detection" content="telephone=no">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <!--[if !mso]><!-->
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <!--<![endif]-->`;

    if (!html.match(/<meta[^>]+charset/i)) {
        html = html.replace(/<head[^>]*>/i, '$&' + metaTags);
    }

    // 3. Enhanced CSS with dark mode support
    const cssReset = `
    <style type="text/css">
        /* Client-specific Styles */
        #outlook a { padding: 0; }
        body { margin: 0 !important; padding: 0 !important; -webkit-text-size-adjust: 100% !important; -ms-text-size-adjust: 100% !important; -webkit-font-smoothing: antialiased !important; }
        table, td { border-collapse: collapse !important; mso-table-lspace: 0pt !important; mso-table-rspace: 0pt !important; }
        img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
        p { display: block; margin: 13px 0; }
        
        /* Dark Mode Support */
        @media (prefers-color-scheme: dark) {
            .dark-mode-bg { background-color: #1a1a1a !important; }
            .dark-mode-text { color: #ffffff !important; }
        }
        
        /* Mobile Styles */
        @media screen and (max-width:600px) {
            .mobile-hide { display: none !important; }
            .mobile-center { text-align: center !important; }
        }
    </style>`;

    if (!html.match(/<style[^>]*>.*?body.*?<\/style>/is)) {
        html = html.replace(/<\/head>/i, cssReset + '</head>');
    }

    return html;
}

// ENHANCED: Anti-spam elements with more variety
function addAntiSpamElements(html) {
    // Rotating invisible text
    const invisibleTexts = [
        'Thank you for being a valued member. Your security is our priority.',
        'このメールは重要なお知らせです。詳細は本文をご確認ください。',
        'This email was sent to you because you have an account with us.',
        'お客様のアカウントに関する重要な情報をお送りしています。',
        'If you no longer wish to receive these emails, please unsubscribe below.',
        'このメールの配信を停止するには、以下のリンクをクリックしてください。'
    ];
    
    const selectedText = invisibleTexts[Math.floor(Math.random() * invisibleTexts.length)];
    
    const invisibleDiv = `
    <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
        ${selectedText}
        &#847; &zwnj; &nbsp; &#8199; &#65279; &#847; &zwnj; &nbsp; &#8199; &#65279;
    </div>`;

    // Add after body tag
    html = html.replace(/<body[^>]*>/i, '$&' + invisibleDiv);

    // Enhanced footer with more legitimacy signals
    if (!html.match(/unsubscribe|配信停止|購読解除/i)) {
        const footer = `
        <div style="margin-top:40px;padding:20px;font-size:11px;color:#666666;text-align:center;border-top:1px solid #e0e0e0;">
            <p style="margin:0 0 10px 0;">このメールは配信専用アドレスから送信されています。</p>
            <p style="margin:0 0 10px 0;">This email was sent from a notification-only address.</p>
            <p style="margin:0;">
                <a href="#" style="color:#666666;text-decoration:underline;">配信停止</a> | 
                <a href="#" style="color:#666666;text-decoration:underline;">Unsubscribe</a> | 
                <a href="#" style="color:#666666;text-decoration:underline;">設定変更</a> | 
                <a href="#" style="color:#666666;text-decoration:underline;">Preferences</a>
            </p>
            <p style="margin:10px 0 0 0;font-size:10px;color:#999999;">
                &copy; ${new Date().getFullYear()} All rights reserved.
            </p>
        </div>`;
        
        html = html.replace(/<\/body>/i, footer + '</body>');
    }

    return html;
}

// ENHANCED: More sophisticated randomization
function randomizeElements(html) {
    // Add various comment types
    const commentTypes = [
        `<!-- Generated: ${Date.now()} -->`,
        `<!-- Build: ${Math.random().toString(36).substr(2, 9)} -->`,
        `<!-- Version: 2.${Math.floor(Math.random() * 9)}.${Math.floor(Math.random() * 99)} -->`,
        `<!-- Render-Engine: Node.js -->`,
        `<!-- Cache-ID: ${crypto.randomBytes(8).toString('hex')} -->`,
        `<!-- Server: nginx/1.${Math.floor(Math.random() * 20)}.${Math.floor(Math.random() * 10)} -->`
    ];

    // Add 2-4 random comments
    const numComments = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numComments; i++) {
        const comment = commentTypes[Math.floor(Math.random() * commentTypes.length)];
        const position = Math.random() > 0.5 ? '<head' : '<body';
        html = html.replace(new RegExp(position, 'i'), comment + '\n' + position);
    }

    // Add zero-width characters in strategic places
    const zeroWidthChars = ['\u200B', '\u200C', '\u200D', '\uFEFF'];
    const tags = html.match(/<(p|div|td|h[1-6])[^>]*>/gi) || [];
    
    tags.slice(0, Math.min(5, tags.length)).forEach(tag => {
        const char = zeroWidthChars[Math.floor(Math.random() * zeroWidthChars.length)];
        html = html.replace(tag, tag + char);
    });

    // Randomly add lang attributes
    if (Math.random() > 0.5 && !html.includes('lang=')) {
        html = html.replace(/<html/i, '<html lang="ja"');
    }

    return html;
}

// ENHANCED: More intelligent encoding
function encodeSpecialChars(html) {
    // Extended patterns with conditions
    const patterns = {
        // Money patterns (encode if appears more than twice)
        '¥': { encoded: '&yen;', probability: 0.7 },
        '$': { encoded: '&#36;', probability: 0.5 },
        '€': { encoded: '&euro;', probability: 0.7 },
        '円': { encoded: '&#20870;', probability: 0.8 },
        
        // Spam trigger words (always encode)
        'FREE': { encoded: 'FR&#69;E', probability: 0.9 },
        'CLICK': { encoded: 'CLI&#67;K', probability: 0.9 },
        '無料': { encoded: '&#28961;&#26009;', probability: 1.0 },
        '今すぐ': { encoded: '&#20170;&#12377;&#12368;', probability: 0.9 },
        'クリック': { encoded: '&#12463;&#12522;&#12483;&#12463;', probability: 0.8 },
        
        // URL encoding (selective)
        'http://': { encoded: 'http&#58;//', probability: 0.3 },
        'https://': { encoded: 'https&#58;//', probability: 0.3 }
    };

    // Apply encoding based on probability
    Object.entries(patterns).forEach(([pattern, config]) => {
        if (Math.random() < config.probability) {
            const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            html = html.replace(regex, config.encoded);
        }
    });

    // Smart email encoding (only encode in visible text, not in headers)
    html = html.replace(/>[^<]*</g, (match) => {
        return match.replace(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, 
            (email, user, domain) => `${user}&#64;${domain}`);
    });

    return html;
}

// ENHANCED: More comprehensive headers
function optimizeHeaders(txn, connection) {

    // 2. Precedence header
    //if (!txn.header.get('Precedence')) {
      //  txn.add_header('Precedence', 'bulk');
    //}

    // 3. Message-ID with better format
    if (!txn.header.get('Message-ID')) {
        const timestamp = Date.now();
        const random = crypto.randomBytes(8).toString('hex');
        const msgId = `<${timestamp}.${random}@${txn.mail_from.host}>`;
        txn.add_header('Message-ID', msgId);
    }

    // 4. Rotating X-Mailer
    const mailers = [
        'PHPMailer 6.5.0',
        'SwiftMailer 6.2.7',
        'Nodemailer 6.7.2',
        'SendGrid-API/3.0'
        ];
    
    //if (txn.header.get('X-Mailer')) {
     //   txn.remove_header('X-Mailer');
    //}
    //txn.add_header('X-Mailer', mailers[Math.floor(Math.random() * mailers.length)]);

    // 5. MIME headers
    if (!txn.header.get('MIME-Version')) {
        txn.add_header('MIME-Version', '1.0');
    }


    // 8. Feedback-ID for tracking (helps with Gmail)
    if (!txn.header.get('Feedback-ID')) {
        const campaignId = crypto.randomBytes(6).toString('hex');
        txn.add_header('Feedback-ID', `${campaignId}:${campaignId}:${campaignId}:${txn.mail_from.host}`);
    }
}

function generateRandomBusinessText() {
    const texts = [
        'Thank you for being a valued member. Your security is our priority.',
        'このメールは重要なお知らせです。詳細は本文をご確認ください。',
        'Service notification for your account. Please review the details below.',
        'お客様のアカウントに関する重要な情報をお送りしています。',
        'This is an automated message from our secure system.',
        'プライバシーとセキュリティは私たちの最優先事項です。',
        'Your privacy and security are our top priorities.',
        'このメールはシステムから自動的に送信されています。'
    ];
    return texts[Math.floor(Math.random() * texts.length)];
}

function generateRandomId() {
    return crypto.randomBytes(16).toString('hex');
}

exports.hook_data = function (next, connection) {
    const txn = connection.transaction;
    if (!txn) return next();

    // Pre-optimization headers
    if (!txn.header.get('Content-Transfer-Encoding')) {
        txn.add_header('Content-Transfer-Encoding', 'quoted-printable');
    }

    next();
};
