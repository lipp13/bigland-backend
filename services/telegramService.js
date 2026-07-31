const https = require('https');

/**
 * Send real-time QR scan audit log to Telegram Bot
 * @param {Object} logData 
 */
async function sendTelegramAuditLog(logData) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    // Log gracefully if Telegram credentials not configured
    if (!token || !chatId || token === 'your_telegram_bot_token_here') {
      console.log('ℹ️ Telegram Notification skipped (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not configured in BE/.env)');
      return;
    }

    const { action, employee, record, deviceInfo, ip, location } = logData;
    const isCheckIn = action === 'CHECK_IN';
    const actionBadge = isCheckIn ? '🟢 <b>ABSEN MASUK (SCAN 1/2)</b>' : '🔵 <b>ABSEN PULANG (SCAN 2/2)</b>';

    const empName = employee?.name || employee?.user?.name || 'Karyawan';
    const empNip = employee?.employee_id || employee?.nip || 'NIP-UNKNOWN';
    const empDept = employee?.department?.name || employee?.department || 'Umum';
    const empPos = employee?.position?.name || employee?.position || 'Staff';

    const scanTime = record?.time || record?.checkIn || record?.checkOut || new Date().toLocaleTimeString('id-ID');
    const scanDate = record?.date || new Date().toISOString().split('T')[0];

    const message = `
${actionBadge}
━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 <b>KARYAWAN:</b> ${empName}
🆔 <b>NIP / ID:</b> <code>${empNip}</code>
🏢 <b>DEPARTEMEN:</b> ${empDept} — ${empPos}
⏰ <b>WAKTU SCAN:</b> ${scanDate} Pukul ${scanTime} WIB
📍 <b>TERMINAL / LOKASI:</b> ${location || 'Lobi Utama Bigland Hotel Sentul'}
📱 <b>PERANGKAT:</b> ${deviceInfo || 'Browser Kiosk Terminal'}
🌐 <b>IP ADDRESS:</b> <code>${ip || '127.0.0.1'}</code>
🛡️ <b>LIMIT HARIAN:</b> Scan Ke-${isCheckIn ? '1 (Masuk)' : '2 (Pulang)'} dari Maks. 2x
━━━━━━━━━━━━━━━━━━━━━━━━━━
🏨 <i>Bigland Sentul HRIS Real-time Audit System</i>
`.trim();

    const postData = JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    });

    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Telegram audit log sent successfully!');
        } else {
          console.warn('⚠️ Telegram API response error:', responseBody);
        }
      });
    });

    req.on('error', (err) => {
      console.warn('⚠️ Telegram HTTP request failed:', err.message);
    });

    req.write(postData);
    req.end();
  } catch (err) {
    console.warn('⚠️ Error formatting Telegram audit log:', err.message);
  }
}

module.exports = {
  sendTelegramAuditLog
};
