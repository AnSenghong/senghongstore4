const GamePayment = {
  BAKONG_CREATE: 'https://api.bakong-api.online/khqr/create',
  BAKONG_CHECK: 'https://api.bakong-api.online/check_by_md5',
  BAKONG_ID: 'ansenghong@aclb',
  MERCHANT_NAME: 'Senghong STore',
  
  TELEGRAM_BOT_TOKEN: '8499942561:AAEinTzwCiPuf1fho_f9v_gOxX72kOMjAgg',
  TELEGRAM_GROUPS: {
    MLBB: '-4911328110',
    OTHER_GAMES: '-4818925664',
    PAYMENT_INFO: '-4974993939'
  },

  currentTransaction: null,
  checkInterval: null,

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  },

  escapeTelegramMarkdown(text) {
    if (!text) return '-';
    return String(text).replace(/[_*`\[\]()~>#+=|{}.!\\-]/g, '\\$&');
  },

  generateOrderId() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `SH${timestamp}${random}`;
  },

  getPhnomPenhTime() {
    return new Date().toLocaleString('en-US', { 
      timeZone: 'Asia/Phnom_Penh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  },

  async createPayment(amount, orderInfo) {
    try {
      const response = await fetch(`${this.BAKONG_CREATE}?amount=${amount}&bakongid=${this.BAKONG_ID}&merchantname=${this.MERCHANT_NAME}`);
      const data = await response.json();
      
      if (data.qr_url || data.qr) {
        const orderId = this.generateOrderId();
        this.currentTransaction = {
          orderId: orderId,
          md5: data.md5,
          transactionId: data.transaction_id || data.tran_id || Date.now().toString(),
          amount: amount,
          orderInfo: orderInfo,
          qrUrl: data.qr_url || data.qr,
          createdAt: new Date(),
          phnomPenhTime: this.getPhnomPenhTime()
        };
        return this.currentTransaction;
      } else {
        throw new Error(data.message || 'Failed to create payment');
      }
    } catch (error) {
      console.error('Create payment error:', error);
      throw error;
    }
  },

  async checkPayment(md5) {
    try {
      const response = await fetch(`${this.BAKONG_CHECK}?md5=${md5}&bakongid=${this.BAKONG_ID}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Check payment error:', error);
      throw error;
    }
  },

  startPaymentCheck(onSuccess, onError) {
    if (!this.currentTransaction) {
      onError('No active transaction');
      return;
    }

    let checkCount = 0;
    const maxChecks = 180;

    this.checkInterval = setInterval(async () => {
      checkCount++;
      
      if (checkCount >= maxChecks) {
        this.stopPaymentCheck();
        onError('Payment timeout. Please try again.');
        return;
      }

      try {
        const result = await this.checkPayment(this.currentTransaction.md5);
        
        if (result.responseCode === 0 || result.status === 'PAID' || result.paid === true) {
          this.stopPaymentCheck();
          this.currentTransaction.paidAt = this.getPhnomPenhTime();
          await this.sendTelegramNotification(this.currentTransaction.orderInfo);
          onSuccess(result);
        }
      } catch (error) {
        console.error('Payment check error:', error);
      }
    }, 5000);
  },

  stopPaymentCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  },

  async sendTelegramMessage(chatId, message) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${this.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message })
      });
      return response.ok;
    } catch (error) {
      console.error('Telegram send error:', error);
      return false;
    }
  },

  async sendTelegramNotification(orderInfo) {
    try {
      const game = orderInfo.game || 'Unknown';
      const userId = orderInfo.userId || orderInfo.username || '-';
      const zoneId = orderInfo.zoneId || orderInfo.password || '';
      const nickname = orderInfo.nickname || '-';
      const product = orderInfo.product || '-';
      const productCode = orderInfo.productCode || product;
      const amount = orderInfo.amount || '0';
      const orderId = this.currentTransaction?.orderId || 'N/A';
      const md5 = this.currentTransaction?.md5 || 'N/A';
      const paidAt = this.currentTransaction?.paidAt || this.getPhnomPenhTime();

      const groupId = game === 'Mobile Legends' ? this.TELEGRAM_GROUPS.MLBB : this.TELEGRAM_GROUPS.OTHER_GAMES;

      let orderMessage = game === 'Mobile Legends' ? `${userId} ${zoneId} ${productCode}` : `${userId} ${productCode}`;

      const fullMessage = `Order ID: ${orderId}\nGame: ${game}\nUser ID: ${userId}${zoneId ? `\nZone ID: ${zoneId}` : ''}\nNickname: ${nickname}\nItem: ${product}\nPrice: $${amount}\nDate: ${paidAt}\nMD5: ${md5}`;

      await this.sendTelegramMessage(groupId, orderMessage);
      await this.sendTelegramMessage(this.TELEGRAM_GROUPS.PAYMENT_INFO, fullMessage);
      
      console.log('Telegram notifications sent successfully');
    } catch (error) {
      console.error('Telegram notification error:', error);
    }
  },

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },

  getSuccessPageHTML(orderInfo) {
    const transaction = this.currentTransaction;
    const orderId = this.escapeHtml(transaction?.orderId || 'N/A');
    const timestamp = this.escapeHtml(transaction?.paidAt || this.getPhnomPenhTime());
    const game = this.escapeHtml(orderInfo.game);
    const userId = this.escapeHtml(orderInfo.userId || orderInfo.username || '-');
    const zoneId = this.escapeHtml(orderInfo.zoneId || '');
    const product = this.escapeHtml(orderInfo.product);
    const amount = this.escapeHtml(orderInfo.amount);
    
    return `
      <div class="success-page">
        <div class="confetti-container">
          <div class="confetti"></div>
          <div class="confetti"></div>
          <div class="confetti"></div>
          <div class="confetti"></div>
          <div class="confetti"></div>
          <div class="confetti"></div>
          <div class="confetti"></div>
          <div class="confetti"></div>
          <div class="confetti"></div>
          <div class="confetti"></div>
          <div class="confetti"></div>
          <div class="confetti"></div>
        </div>
        
        <div class="success-sticker">
          <div class="sticker-bounce">
            <div class="check-circle">
              <i class="fas fa-check"></i>
            </div>
            <div class="sparkles">
              <i class="fas fa-star sparkle s1"></i>
              <i class="fas fa-star sparkle s2"></i>
              <i class="fas fa-star sparkle s3"></i>
              <i class="fas fa-star sparkle s4"></i>
            </div>
          </div>
        </div>
        
        <h2 class="success-title">ការទូទាត់បានជោគជ័យ! 🎉</h2>
        <p class="success-subtitle">អរគុណសម្រាប់ការទិញរបស់អ្នក!</p>
        
        <div class="order-details-card">
          <div class="order-detail-row">
            <span class="detail-label"><i class="fas fa-receipt"></i> Order ID</span>
            <span class="detail-value">${orderId}</span>
          </div>
          <div class="order-detail-row">
            <span class="detail-label"><i class="fas fa-gamepad"></i> Game</span>
            <span class="detail-value">${game}</span>
          </div>
          <div class="order-detail-row">
            <span class="detail-label"><i class="fas fa-user"></i> User ID</span>
            <span class="detail-value">${userId}</span>
          </div>
          ${zoneId ? `
          <div class="order-detail-row">
            <span class="detail-label"><i class="fas fa-server"></i> Server ID</span>
            <span class="detail-value">${zoneId}</span>
          </div>
          ` : ''}
          ${orderInfo.password ? `
          <div class="order-detail-row">
            <span class="detail-label"><i class="fas fa-key"></i> Password</span>
            <span class="detail-value">••••••••</span>
          </div>
          ` : ''}
          <div class="order-detail-row">
            <span class="detail-label"><i class="fas fa-box"></i> Item</span>
            <span class="detail-value">${product}</span>
          </div>
          <div class="order-detail-row">
            <span class="detail-label"><i class="fas fa-dollar-sign"></i> Amount</span>
            <span class="detail-value highlight">$${amount}</span>
          </div>
          <div class="order-detail-row">
            <span class="detail-label"><i class="fas fa-clock"></i> Time</span>
            <span class="detail-value">${timestamp}</span>
          </div>
          <div class="order-detail-row status-row">
            <span class="detail-label"><i class="fas fa-check-circle"></i> Status</span>
            <span class="detail-value status-paid"><i class="fas fa-check"></i> Paid</span>
          </div>
        </div>
        
        <p class="delivery-note">
          <i class="fas fa-info-circle"></i>
          របស់អ្នកនឹងត្រូវបានបញ្ជូលក្នុងរយៈពេលឆាប់ៗ។ សូមរង់ចាំ!
        </p>
      </div>
    `;
  }
};

window.GamePayment = GamePayment;
