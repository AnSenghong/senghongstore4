const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

const PORT = 5000;

const TELEGRAM_BOT_TOKEN = '8499942561:AAEinTzwCiPuf1fho_f9v_gOxX72kOMjAgg';
const TELEGRAM_GROUPS = {
  MLBB: '-4911328110',
  OTHER_GAMES: '-4818925664',
  PAYMENT_INFO: '-4974993939'
};

function sendTelegramMessage(chatId, message) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      chat_id: chatId,
      text: message
    });

    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Telegram API error: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.WEBP': 'image/webp',
  '.PNG': 'image/png'
};

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/telegram-notify') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const orderInfo = data.orderInfo || {};
        const transaction = data.transaction || {};

        const game = orderInfo.game || 'Unknown';
        const userId = orderInfo.userId || orderInfo.username || '-';
        const zoneId = orderInfo.zoneId || orderInfo.password || '';
        const nickname = orderInfo.nickname || '-';
        const product = orderInfo.product || '-';
        const productCode = orderInfo.productCode || product;
        const amount = orderInfo.amount || '0';
        const orderId = transaction.orderId || '-';
        const md5 = transaction.md5 || '-';
        const paidAt = transaction.paidAt || '-';

        const groupId = game === 'Mobile Legends' ? TELEGRAM_GROUPS.MLBB : TELEGRAM_GROUPS.OTHER_GAMES;

        let orderMessage;
        if (game === 'Mobile Legends') {
          orderMessage = `${userId} ${zoneId} ${productCode}`;
        } else {
          orderMessage = `${userId} ${productCode}`;
        }

        const fullMessage = `Order ID: ${orderId}
Game: ${game}
User ID: ${userId}${zoneId ? `\nZone ID: ${zoneId}` : ''}
Nickname: ${nickname}
Item: ${product}
Price: $${amount}
Date: ${paidAt}
MD5: ${md5}`;

        await sendTelegramMessage(groupId, orderMessage);
        await sendTelegramMessage(TELEGRAM_GROUPS.PAYMENT_INFO, fullMessage);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        console.error('Telegram notification error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = decodeURIComponent(filePath);
  filePath = path.join('.', filePath);

  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
    } else {
      const cacheControl = ext.match(/\.(png|jpg|jpeg|webp|gif|svg|ico|woff|woff2|ttf|PNG|WEBP)$/i) 
        ? 'public, max-age=86400' 
        : 'no-cache';
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Cache-Control': cacheControl
      });
      res.end(content);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
