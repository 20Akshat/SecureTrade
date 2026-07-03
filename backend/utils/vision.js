const axios = require('axios');

/**
 * Analyzes a document screenshot using Google Gemini Vision API.
 * Compares the image text with the expected ID value and checks for digital edits/manipulations.
 */
async function verifyDocumentImage(imageBuffer, mimeType, expectedId, documentType) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.warn("⚠️ [VISION WARNING] GEMINI_API_KEY is not configured. Bypassing AI verification checks.");
        return { success: true, isAuthentic: true, matched: true, reason: "Bypassed - API Key missing" };
    }

    const base64Image = imageBuffer.toString('base64');
    const prompt = `Analyze this uploaded image which is supposed to be a ${documentType}.
Expected ${documentType} Number / ID to find: "${expectedId}".

You must perform three checks:
1. Document Identification: Check if the uploaded image is actually a valid document of type ${documentType} (e.g., Aadhaar Card, PAN Card, or Broker/Setting Profile page). If the image is a random photograph, selfie, animal, object, landscape, text of a book, or any other unrelated file, you must reject it.
2. ID Verification: Locate and extract the ${documentType} ID/Number from the image. Does it match the expected ID "${expectedId}"? (Case-insensitive check).
3. Authenticity Check: Look closely for digital alterations. Are there misaligned letters/digits, inconsistent fonts within the ID string, duplicate text overlays, copy-paste artifact borders, or whiteout spots indicating Photoshop/editing? Do not fail blurry or normal camera photos, only flag clear digital modifications of the document contents.

Respond in strict JSON format:
{
  "isAuthentic": true/false,
  "matched": true/false,
  "reason": "Brief reason explaining the match and authenticity result"
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

        const result = JSON.parse(textResponse.trim());
        return {
            success: true,
            isAuthentic: !!result.isAuthentic,
            matched: !!result.matched,
            reason: result.reason || ""
        };
    } catch (err) {
        console.error("Gemini Vision verification error:", err.message);
        // Fallback pass in case of API outages or rate limit limits so genuine users aren't locked out,
        // but log the warning.
        return {
            success: true,
            isAuthentic: true,
            matched: true,
            warning: "Vision check bypassed due to API error: " + err.message
        };
    }
}

module.exports = {
    verifyDocumentImage
};
