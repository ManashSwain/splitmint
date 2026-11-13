import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const RECEIPT_MODEL = 'gemini-3.5-flash-lite';

const VALID_CURRENCIES = new Set([
  'INR',
  'USD',
  'EUR',
  'JPY',
  'GBP',
  'CAD',
  'AUD',
]);

const VALID_CATEGORIES = new Set([
  'dining',
  'stay',
  'transit',
  'activities',
  'groceries',
  'other',
]);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.post('/api/receipts/parse', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({
          error:
            'Gemini API key is not configured. Please check Settings > Secrets.',
        });
        return;
      }

      const { receiptText, defaultCurrency = 'USD', friendNames = [] } =
        req.body ?? {};

      if (typeof receiptText !== 'string' || receiptText.trim().length < 3) {
        res.status(400).json({
          error: 'Please paste a receipt or expense note to extract items.',
        });
        return;
      }

      const safeText = receiptText.slice(0, 15000).trim();
      const safeFriends = Array.isArray(friendNames)
        ? friendNames.filter((n): n is string => typeof n === 'string')
        : [];

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = [
        `Default trip currency: ${defaultCurrency}`,
        safeFriends.length > 0
          ? `Friends on this trip: ${safeFriends.join(', ')}`
          : 'Friends on this trip: none specified',
        '',
        'Receipt or chat note to parse:',
        safeText,
      ].join('\n');

      const response = await ai.models.generateContent({
        model: RECEIPT_MODEL,
        contents: prompt,
        config: {
          systemInstruction: [
            'You extract structured bill line items, tax, and tip from messy restaurant receipts or casual group chat messages.',
            'Rules:',
            '1. Extract every distinct food, drink, or purchased line item with its line-total price in major currency units (do NOT include subtotal or grand total rows as line items).',
            '2. Extract tax (including GST, VAT, sales tax, service charge) into "tax", and gratuity/tip into "tip". If not present, return 0.',
            '3. Detect the currency code from symbols or text (e.g. ₹/Rs -> INR, $/USD -> USD, €/EUR -> EUR, ¥/JPY -> JPY, £ -> GBP). Fall back to the default trip currency if ambiguous.',
            '4. Pick the best category from: dining, stay, transit, activities, groceries, other.',
            '5. If the text explicitly mentions which friends shared or ordered a specific item, include their exact matching names from the provided friend list in "suggestedSharers". Otherwise return an empty array.',
            '6. Extract date as YYYY-MM-DD only if clearly present; otherwise return "".',
          ].join('\n'),
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: 'Short merchant name or bill title',
              },
              currency: {
                type: Type.STRING,
                description:
                  '3-letter currency code: INR, USD, EUR, JPY, GBP, CAD, or AUD',
              },
              category: {
                type: Type.STRING,
                description:
                  'One of: dining, stay, transit, activities, groceries, other',
              },
              date: {
                type: Type.STRING,
                description: 'YYYY-MM-DD if stated, otherwise empty string',
              },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: {
                      type: Type.STRING,
                      description: 'Clean line item name (include quantity if > 1)',
                    },
                    amount: {
                      type: Type.NUMBER,
                      description:
                        'Total price for this line item in major currency units',
                    },
                    suggestedSharers: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description:
                        'Exact friend names from the trip list if mentioned for this item',
                    },
                  },
                  required: ['name', 'amount', 'suggestedSharers'],
                },
              },
              tax: {
                type: Type.NUMBER,
                description:
                  'Total tax / GST / VAT / service fee in major currency units, or 0',
              },
              tip: {
                type: Type.NUMBER,
                description:
                  'Total tip / gratuity in major currency units, or 0',
              },
            },
            required: ['title', 'currency', 'category', 'items', 'tax', 'tip'],
          },
        },
      });

      const rawJson = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawJson);

      const detectedCurrency = VALID_CURRENCIES.has(parsed.currency)
        ? parsed.currency
        : VALID_CURRENCIES.has(defaultCurrency)
          ? defaultCurrency
          : 'USD';

      const detectedCategory = VALID_CATEGORIES.has(parsed.category)
        ? parsed.category
        : 'dining';

      const items = Array.isArray(parsed.items)
        ? parsed.items
            .map((item: Record<string, unknown>) => ({
              name:
                typeof item.name === 'string' && item.name.trim()
                  ? item.name.trim()
                  : 'Line item',
              amount:
                typeof item.amount === 'number' &&
                Number.isFinite(item.amount) &&
                item.amount > 0
                  ? item.amount
                  : 0,
              suggestedSharers: Array.isArray(item.suggestedSharers)
                ? item.suggestedSharers.filter(
                    (s): s is string => typeof s === 'string'
                  )
                : [],
            }))
            .filter((item: { amount: number }) => item.amount > 0)
        : [];

      const tax =
        typeof parsed.tax === 'number' &&
        Number.isFinite(parsed.tax) &&
        parsed.tax >= 0
          ? parsed.tax
          : 0;
      const tip =
        typeof parsed.tip === 'number' &&
        Number.isFinite(parsed.tip) &&
        parsed.tip >= 0
          ? parsed.tip
          : 0;

      const dateStr =
        typeof parsed.date === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(parsed.date.trim())
          ? parsed.date.trim()
          : '';

      res.json({
        title:
          typeof parsed.title === 'string' && parsed.title.trim()
            ? parsed.title.trim()
            : 'Receipt Bill',
        currency: detectedCurrency,
        category: detectedCategory,
        date: dateStr,
        items,
        tax,
        tip,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to extract receipt items. Please try again.';
      console.error('Receipt parse error:', err);
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SplitMint server listening on http://localhost:${PORT}`);
  });
}

startServer();
