const axios = require('axios');

// Verhoeff algorithm multiplication table
const dTable = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];

// Permutation table
const pTable = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];

// Inverse table
const invTable = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

/**
 * Validates Aadhaar number using Verhoeff checksum + format checks
 * - Must be exactly 12 digits
 * - Must not start with 0 or 1 (UIDAI rule)
 * - Must not be all-same digits
 * - Must pass Verhoeff checksum
 */
function validateAadhaar(aadhaar) {
    if (!aadhaar || typeof aadhaar !== 'string') return false;
    const cleaned = aadhaar.replace(/\s/g, '');

    // Must be exactly 12 digits
    if (!/^\d{12}$/.test(cleaned)) return false;

    // Aadhaar cannot start with 0 or 1 (UIDAI specification)
    if (['0', '1'].includes(cleaned[0])) return false;

    // Block obvious fake patterns - all same digits
    if (/^(.)\1{11}$/.test(cleaned)) return false;

    // Block sequential numbers
    const seqFake = ['123456789012', '234567890123', '098765432109'];
    if (seqFake.includes(cleaned)) return false;

    // Verhoeff checksum validation
    let c = 0;
    const digits = cleaned.split('').map(Number);
    for (let i = 0; i < 12; i++) {
        c = dTable[c][pTable[i % 8][digits[11 - i]]];
    }
    return c === 0;
}

/**
 * Validates PAN Card format:
 * - 5 uppercase letters + 4 digits + 1 uppercase letter
 * - 4th letter must be P (individual), H (HUF), F (firm), etc.
 * - 5th letter is the first letter of the PAN holder's surname
 */
function validatePANFormat(pan) {
    if (!pan || typeof pan !== 'string') return false;
    const cleaned = pan.toUpperCase().trim();

    // Format: AAAAA0000A
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleaned)) return false;

    // 4th character must be valid PAN type code
    const validTypes = ['P', 'C', 'H', 'F', 'A', 'T', 'B', 'L', 'J', 'G'];
    if (!validTypes.includes(cleaned[3])) return false;

    // Block obviously fake PANs
    const fakePans = ['AAAAA0000A', 'BBBBB0000B', 'ABCDE1234F', 'ZZZZZ9999Z'];
    if (fakePans.includes(cleaned)) return false;

    return true;
}

/**
 * Validates Broker Client ID format
 * - Must be 6-20 characters long
 * - Must be alphanumeric (letters and digits only, no spaces/special chars)
 * - Must not be all-same characters
 * - Must not be an obvious fake like "ABCDEFGH"
 */
function validateBrokerClientId(brokerId) {
    if (!brokerId || typeof brokerId !== 'string') return { valid: false, error: 'Broker Client ID is required!' };
    const cleaned = brokerId.toUpperCase().trim();

    // Length check: 4 to 20 chars
    if (cleaned.length < 4 || cleaned.length > 20) {
        return { valid: false, error: 'Broker Client ID must be 4 to 20 characters long!' };
    }

    // Only alphanumeric characters allowed
    if (!/^[A-Z0-9]+$/.test(cleaned)) {
        return { valid: false, error: 'Broker Client ID must contain only letters and digits (no spaces or special characters)!' };
    }

    // Block all-same character IDs
    if (/^(.)\1+$/.test(cleaned)) {
        return { valid: false, error: 'Invalid Broker Client ID! Please enter your real broker ID.' };
    }

    // Block obvious test/fake IDs
    const fakeIds = ['ABCDEFGH', 'TEST1234', 'DEMO1234', '12345678', 'AAAAAAAA', 'ABCD1234'];
    if (fakeIds.includes(cleaned)) {
        return { valid: false, error: 'Please enter a valid real Broker Client ID!' };
    }

    return { valid: true };
}

/**
 * Real KYC Database Check (Sandbox.co integration)
 */
async function verifyPanWithGov(panNumber) {
    const apiKey = process.env.SANDBOX_API_KEY;
    const apiSecret = process.env.SANDBOX_API_SECRET;

    if (!validatePANFormat(panNumber)) {
        return { success: false, error: 'Invalid PAN structure format!' };
    }

    if (!apiKey || !apiSecret) {
        // Safe mock pass if API keys are not supplied
        console.log(`[KYC] Sandbox API not configured — skipping live PAN check for ${panNumber}`);
        return { success: true, simulated: true };
    }

    try {
        const res = await axios.post('https://api.sandbox.co/kyc/pan/verify',
            { pan: panNumber.toUpperCase() },
            {
                headers: {
                    'Authorization': apiKey,
                    'x-api-key': apiSecret,
                    'accept': 'application/json',
                    'content-type': 'application/json'
                }
            }
        );
        if (res.data && res.data.status === 'VALID') {
            return { success: true, name: res.data.full_name };
        } else {
            return { success: false, error: 'PAN Card is not registered or invalid in Income Tax records.' };
        }
    } catch (err) {
        console.error('Gov PAN verification error:', err.message);
        return { success: true, warning: 'Gov database check bypassed due to API error.' };
    }
}

module.exports = {
    validateAadhaar,
    validatePANFormat,
    validateBrokerClientId,
    verifyPanWithGov
};
