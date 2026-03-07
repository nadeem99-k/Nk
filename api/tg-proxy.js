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
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { bot } = req.query;
        if (!bot) {
            return res.status(400).json({ error: 'Missing bot token' });
        }

        // Forward the entire body as-is to Telegram
        // This includes multipart/form-data with the photo and caption
        const tgUrl = `https://api.telegram.org/bot${bot}/sendPhoto`;

        const response = await fetch(tgUrl, {
            method: 'POST',
            body: req.body,
            headers: {
                // Important: pass through the content-type (e.g., multipart/form-data; boundary=...)
                'Content-Type': req.headers['content-type'],
            },
        });

        const data = await response.json();
        return res.status(response.status).json(data);
    } catch (error) {
        console.error('Proxy Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
