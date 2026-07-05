const axios = require('axios');

/**
 * Analyzes a document screenshot using Google Gemini Vision API.
 * Compares the image text with the expected ID value, extracts owner name, and checks authenticity.
 */
async function verifyDocumentImage(imageBuffer, mimeType, expectedId, documentType) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.warn("⚠️ [VISION WARNING] GEMINI_API_KEY is not configured. Bypassing AI verification checks.");
        return { success: true, isAuthentic: true, matched: true, extractedName: "Demo Name", reason: "Bypassed - API Key missing" };
    }

    const base64Image = imageBuffer.toString('base64');
    const prompt = `Analyze this uploaded image which is supposed to be a ${documentType}.
Expected ${documentType} Number / ID to find: "${expectedId}".

You must perform four strict checks:
1. Document Identification: Check if the uploaded image is actually a valid document of type ${documentType} (e.g., Aadhaar Card, PAN Card, or Broker/Setting Profile page). If the image is a random photograph, selfie, animal, object, landscape, text of a book, or any other unrelated file, you must reject it.
2. Strict ID Verification: Locate the ${documentType} ID/Number printed in the image. It must match the expected ID "${expectedId}" exactly (character-for-character check, case-insensitive, ignoring only spaces or hyphens). If the document image contains a different ID/Number (even by a single digit or letter, e.g. "ABC123" vs expected "XYZ999"), you MUST return "matched": false. Do not be lenient.
3. Full Name Extraction: Extract the cardholder's / account owner's Full Name from the document image text. The owner name must be present on the document. If no name can be read, or if the name is cropped/missing, set "matched": false and explain in the reason.
4. Authenticity Check: Look closely for digital alterations. Are there misaligned letters/digits, inconsistent fonts within the ID string, duplicate text overlays, copy-paste artifact borders, or whiteout spots indicating Photoshop/editing? Do not fail blurry or normal camera photos, only flag clear digital modifications of the document contents.

Respond in strict JSON format:
{
  "isAuthentic": true/false,
  "matched": true/false,
  "extractedName": "EXTRACTED_FULL_NAME_HERE",
  "reason": "Brief reason explaining the match, extracted name and authenticity result"
}`;

    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                contents: [
                    {
                        parts: [
                            { text: prompt },
                            {
                                inlineData: {
                                    mimeType: mimeType || "image/jpeg",
                                    data: base64Image
                                }
                            }
                        ]
                    }
                ],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            },
            {
                headers: { "Content-Type": "application/json" },
                timeout: 25000
            }
        );

        const candidate = response.data?.candidates?.[0];
        const textResponse = candidate?.content?.parts?.[0]?.text;
        if (!textResponse) {
            return { success: false, error: "Empty response from Vision AI." };
        }

        const parsed = JSON.parse(textResponse.trim());
        return {
            success: true,
            isAuthentic: parsed.isAuthentic,
            matched: parsed.matched,
            extractedName: parsed.extractedName || "",
            reason: parsed.reason
        };
    } catch (err) {
        console.error("Gemini Vision API Error:", err.message);
        return { success: false, error: err.message };
    }
}

module.exports = { verifyDocumentImage };
