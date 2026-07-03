/**
 * validators.js - Input validation utility for SecureTrade
 * Validates emails (blocks disposable/fake domains) and phone numbers
 */

// Common disposable/fake email domains to block
const DISPOSABLE_DOMAINS = [
    'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
    'fakeinbox.com', 'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com',
    'grr.la', 'guerrillamail.info', 'guerrillamail.biz', 'guerrillamail.de',
    'guerrillamail.net', 'guerrillamail.org', 'spam4.me', 'trashmail.com',
    'trashmail.at', 'trashmail.io', 'trashmail.me', 'trashmail.net',
    'dispostable.com', 'maildrop.cc', 'discard.email', 'spamgourmet.com',
    'spamgourmet.net', 'spamgourmet.org', 'tempr.email', 'spamhereplease.com',
    'spamhere.guru', 'spamthisplease.com', 'mailnull.com', 'notmailinator.com',
    'mailexpire.com', 'spambox.us', 'spamex.com', 'spamevader.com', 'mailzilla.com',
    'mailzilla.org', 'spaml.de', 'spaml.com', 'spamoff.de', 'hulapla.de',
    'humaility.com', 'jetable.com', 'jetable.fr.nf', 'jetable.net', 'jetable.org',
    'nospam.ze.tc', 'nospamfor.us', 'nospammail.net', 'obobbo.com', 'odnorazovoe.ru',
    'wegwerfmail.de', 'wegwerfmail.net', 'wegwerfmail.org', 'fakemail.fr',
    'mt2015.com', 'mt2014.com', 'throwam.com', 'moakt.com', 'throwam.com',
    'notld.net', 'getonemail.com', 'getonemail.net', 'anonbox.net', 'teleworm.us',
    'dayrep.com', 'einrot.com', 'fleckens.hu', 'gustr.com', 'incognitomail.com',
    'incognitomail.net', 'incognitomail.org', 'koszmail.pl', 'kulturbetrieb.info',
    'lhsdv.com', 'mail.mezimages.net', 'maildx.com', 'meltmail.com', 'amilegit.com',
    'squizzy.net', 'stuffmail.de', 'super-auswahl.de', 'trbvm.com', 'trn.la',
    'gmal.com', 'gnail.com', 'gmial.com', 'hotmal.com', 'yahooo.com', 'yahou.com',
    'outlok.com', 'outllok.com',
];

/**
 * Validates email format and blocks disposable/fake domains
 * @param {string} email
 * @returns {{ valid: boolean, error?: string }}
 */
function validateEmail(email) {
    if (!email || typeof email !== 'string') {
        return { valid: false, error: 'Email is required!' };
    }

    const trimmed = email.trim().toLowerCase();

    // Basic email format check
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmed)) {
        return { valid: false, error: 'Invalid email format! Please enter a valid email address.' };
    }

    // Extract domain
    const domain = trimmed.split('@')[1];
    if (!domain) {
        return { valid: false, error: 'Invalid email domain!' };
    }

    // Block disposable/fake email domains
    if (DISPOSABLE_DOMAINS.includes(domain)) {
        return { valid: false, error: 'Disposable or temporary email addresses are not allowed! Please use a real email.' };
    }

    // Block emails with suspicious patterns
    if (/^[a-z]{1,3}[0-9]{5,}@/.test(trimmed)) {
        // Pattern like abc123456@ - likely auto-generated
        // This is a weak heuristic, skip for now to avoid false positives
    }

    return { valid: true };
}

/**
 * Validates Indian mobile number (10-digit, starting with 6-9)
 * @param {string} phone
 * @returns {{ valid: boolean, error?: string }}
 */
function validatePhone(phone) {
    if (!phone || typeof phone !== 'string') {
        return { valid: false, error: 'Mobile number is required!' };
    }

    const trimmed = phone.replace(/\s/g, '').replace(/^\+91/, ''); // strip +91

    // Must be exactly 10 digits
    if (!/^[0-9]{10}$/.test(trimmed)) {
        return { valid: false, error: 'Mobile number must be exactly 10 digits!' };
    }

    // Must start with 6, 7, 8, or 9 (valid Indian numbers)
    if (!/^[6-9]/.test(trimmed)) {
        return { valid: false, error: 'Invalid Indian mobile number! Must start with 6, 7, 8 or 9.' };
    }

    // Block obvious fake/test numbers
    const fakePatternsPhone = [
        '1234567890', '0987654321', '9999999999', '8888888888', '7777777777',
        '6666666666', '1111111111', '0000000000', '9876543210', '9000000000',
        '6000000000', '7000000000', '8000000000',
    ];
    if (fakePatternsPhone.includes(trimmed)) {
        return { valid: false, error: 'Please enter a valid real mobile number!' };
    }

    // Block all-same-digit numbers (e.g. 9999999999, 8888888888)
    if (/^(.)\1{9}$/.test(trimmed)) {
        return { valid: false, error: 'Please enter a valid real mobile number!' };
    }

    return { valid: true };
}

module.exports = { validateEmail, validatePhone };
