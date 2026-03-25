import express from 'express';
import OpenAI from 'openai';
const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key_to_prevent_crash_initialization',
});

// One-Shot Analyze & Extract invoice data using OpenAI Vision
router.post('/analyze', async (req, res) => {
  const { file, msmeId } = req.body;
  if (!file || !process.env.OPENAI_API_KEY) {
    return res.status(400).json({ error: 'File or API Key missing' });
  }

  try {
    // Look up MSME context (mock data for dev)
    let msmeContext = JSON.stringify({
      msmeId: msmeId || 'UNKNOWN',
      name: 'ABC Traders Pvt Ltd',
      gst: '33ABCDE1234F1Z5',
      location: 'Chennai'
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

      CRITICAL CHECKS:
      1. Does the Seller Name on the invoice match the registered MSME name?
      2. Does the Seller GSTIN on the invoice match the registered MSME GSTIN?

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
        "message": "If verified successfully: 'Invoice Verified Successfully.' If failed: 'Verification Failed. Expected [Field] to be [Registered Value] but retrieved [Extracted Value] from document.'",
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
