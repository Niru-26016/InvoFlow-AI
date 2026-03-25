import express from 'express';
import OpenAI from 'openai';
const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key_to_prevent_crash_initialization',
});

// One-Shot Analyze & Extract invoice data using OpenAI Vision
router.post('/analyze', async (req, res) => {
  const { file, msmeId, msmeProfile } = req.body;
  if (!file || !process.env.OPENAI_API_KEY) {
    return res.status(400).json({ error: 'File or API Key missing' });
  }

  try {
    // Use real MSME profile from Firestore (passed by frontend)
    const msmeContext = JSON.stringify({
      msmeId: msmeId || 'UNKNOWN',
      name: msmeProfile?.name || 'Not Provided',
      gst: msmeProfile?.gstin || 'Not Provided',
    });

    const aiPrompt = `
      Extract the following details from this invoice:
      - Seller Name
      - Seller GSTIN
      - Buyer Name
      - Buyer GSTIN
      - Invoice Number
      - Amount
      - Due Date
      - Description of goods/services

      We must verify this invoice against our registered company records.
      Here are the Registered Details of the Seller (MSME) uploading this invoice:
      ${msmeContext}

      STRICT VERIFICATION RULES:
      1. Compare the SELLER NAME on the invoice with the registered MSME name above.
         - Use fuzzy matching: ignore case, extra spaces, and legal suffixes like "Pvt Ltd", "Private Limited", "LLP", "Inc".
         - The core business name MUST match. "ABC Traders" matches "ABC Traders Pvt Ltd", but "ABC Traders" does NOT match "XYZ Traders".
      2. Compare the SELLER GSTIN on the invoice with the registered MSME GSTIN above.
         - MUST be an exact match (case-insensitive). "33ABCDE1234F1Z5" matches "33abcde1234f1z5".
      3. If the registered name is "Not Provided" or empty, the name check is INCONCLUSIVE — do NOT auto-pass, mark verified=false with message "Seller profile incomplete. Cannot verify name."
      4. If the registered GSTIN is "Not Provided" or empty, the GSTIN check is INCONCLUSIVE — do NOT auto-pass, mark verified=false with message "Seller GSTIN not registered. Cannot verify GSTIN."
      5. ONLY set verified=true if BOTH name AND GSTIN checks explicitly PASS (both are provided AND both match).
      6. If ANY check fails or is inconclusive, set verified=false.

      Return a JSON object with this exact structure:
      {
        "extracted": {
          "buyerName": "text",
          "buyerGSTIN": "text",
          "invoiceNumber": "text",
          "amount": number,
          "dueDate": "YYYY-MM-DD",
          "description": "text"
        },
        "verified": boolean,
        "message": "If verified: 'All checks passed. Invoice is authentic.' If failed: list mismatches generically (e.g. 'Seller name mismatch detected.'). Do NOT reveal expected or retrieved values.",
        "confidence": 0.0 to 1.0
      }
    `;

    let content;
    if (file.name.toLowerCase().endsWith('.pdf')) {
      content = [
        { type: "text", text: aiPrompt },
        { 
          type: "file", 
          file: { 
            file_data: `data:application/pdf;base64,${file.data}`, 
            filename: file.name 
          } 
        }
      ];
    } else {
      const mimeType = file.name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
      content = [
        { type: "text", text: aiPrompt },
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${file.data}` } }
      ];
    }

    const openAiResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are an AI assistant analyzing invoice data. You MUST return JSON data in the defined format." },
        { role: "user", content: content }
      ]
    });

    const aiResultContent = JSON.parse(openAiResponse.choices[0].message.content);
    res.json({ success: true, analysis: aiResultContent });

  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
