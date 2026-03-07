/**
 * Vercel Serverless Function: Telegram Proxy
 * Bypasses regional blocks (like in Pakistan) by routing requests through Vercel's global infrastructure.
 */

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    // 1. Handle CORS Preflight
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(200).end();
    }

    // 2. Friendly Diagnostic for GET
    if (req.method === 'GET') {
        return res.status(200).json({
            status: 'active',
            message: 'Telegram Proxy is running.',
            usage: 'Send a POST request with bot=TOKEN in the query and a multipart/form-data body containing "photo" and "caption".'
        });
    }

    // 3. Main Proxy Logic (POST)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: `Method ${req.method} not allowed. Please use POST for proxy requests.` });
    }

    try {
        const { bot } = req.query;
        if (!bot) {
            return res.status(400).json({ error: 'Missing "bot" token in query string (?bot=TOKEN)' });
        }

        const contentType = req.headers['content-type'];
        if (!contentType || !contentType.includes('multipart/form-data')) {
            return res.status(400).json({ error: 'Invalid Content-Type. Expected multipart/form-data for sendPhoto.' });
        }

        // Forward the entire body as-is to Telegram
        const tgUrl = `https://api.telegram.org/bot${bot}/sendPhoto`;

        const response = await fetch(tgUrl, {
            method: 'POST',
            body: req.body,
            headers: {
                'Content-Type': contentType,
            },
        });

        const data = await response.json();
        return res.status(response.status).json(data);
    } catch (error) {
        console.error('Proxy Error:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
