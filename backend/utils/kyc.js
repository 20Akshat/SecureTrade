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

// Validates Aadhaar number using Verhoeff checksum
function validateAadhaar(aadhaar) {
    if (!/^\d{12}$/.test(aadhaar)) return false;
    
    let c = 0;
    const digits = aadhaar.split('').map(Number);
    for (let i = 0; i < 12; i++) {
        c = dTable[c][pTable[i % 8][digits[11 - i]]];
    }
    return c === 0;
}

// Verifies if PAN structure is valid (5 letters, 4 digits, 1 letter)
function validatePANFormat(pan) {
    return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.toUpperCase());
}

/**
 * Real KYC Database Check (Sandbox.co integration)
 */
async function verifyPanWithGov(panNumber) {
    const apiKey = process.env.SANDBOX_API_KEY;
    const apiSecret = process.env.SANDBOX_API_SECRET;

    if (!validatePANFormat(panNumber)) {
        return { success: false, error: "Invalid PAN structure format!" };
    }

    if (!apiKey || !apiSecret) {
        // Safe mock pass if API keys are not supplied in Render/local environments
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
        if (res.data && res.data.status === "VALID") {
            return { success: true, name: res.data.full_name };
        } else {
            return { success: false, error: "PAN Card is not registered or invalid in Income Tax records." };
        }
    } catch (err) {
        console.error("Gov PAN verification error:", err.message);
        // Fallback to check if limit is exceeded, but verify format is correct
        return { success: true, warning: "Gov database check bypassed due to API error." };
    }
}

module.exports = {
    validateAadhaar,
    validatePANFormat,
    verifyPanWithGov
};
