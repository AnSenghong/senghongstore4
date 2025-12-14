const https = require('https');

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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderInfo, transaction } = req.body;

    const game = orderInfo?.game || 'Unknown';
    const userId = orderInfo?.userId || orderInfo?.username || '-';
    const zoneId = orderInfo?.zoneId || orderInfo?.password || '';
    const nickname = orderInfo?.nickname || '-';
    const product = orderInfo?.product || '-';
    const productCode = orderInfo?.productCode || product;
    const amount = orderInfo?.amount || '0';
    const orderId = transaction?.orderId || '-';
    const md5 = transaction?.md5 || '-';
    const paidAt = transaction?.paidAt || '-';

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

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Telegram notification error:', error);
    return res.status(500).json({ error: error.message });
  }
};
