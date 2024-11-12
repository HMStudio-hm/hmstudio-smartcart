// src/scripts/smartCart.js v1.5.5
// HMStudio Smart Cart with Campaign Support

(function() {
  console.log('Smart Cart script initialized');

  function getStoreIdFromUrl() {
    const scriptTag = document.currentScript;
    const scriptUrl = new URL(scriptTag.src);
    const storeId = scriptUrl.searchParams.get('storeId');
    return storeId ? storeId.split('?')[0] : null;
  }

  function getCampaignsFromUrl() {
    const scriptTag = document.currentScript;
    const scriptUrl = new URL(scriptTag.src);
    const campaignsData = scriptUrl.searchParams.get('campaigns');
    
    if (!campaignsData) {
        console.log('No campaigns data found in URL');
        return [];
    }

    try {
        const decodedData = atob(campaignsData);
        const parsedData = JSON.parse(decodedData);
        
        return parsedData.map(campaign => ({
            ...campaign,
            timerSettings: {
                ...campaign.timerSettings,
                textAr: decodeURIComponent(campaign.timerSettings.textAr || ''),
                textEn: decodeURIComponent(campaign.timerSettings.textEn || ''),
                autoRestart: campaign.timerSettings?.autoRestart || false
            }
        }));
    } catch (error) {
        console.error('Error parsing campaigns data:', error);
        return [];
    }
  }

  function getCurrentLanguage() {
    return document.documentElement.lang || 'ar';
  }

  function isMobile() {
    return window.innerWidth <= 768;
  }

  const storeId = getStoreIdFromUrl();
  if (!storeId) {
    console.error('Store ID not found in script URL');
    return;
  }

  const SmartCart = {
    settings: null,
    campaigns: getCampaignsFromUrl(),
    stickyCartElement: null,
    currentProductId: null,
    activeTimers: new Map(),
    updateInterval: null,
    _updating: false,

    createStickyCart() {
      if (this.stickyCartElement) {
        this.stickyCartElement.remove();
      }
    
      const container = document.createElement('div');
      container.id = 'hmstudio-sticky-cart';
      container.style.cssText = `
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        background: white;
        box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);
        padding: ${isMobile() ? '8px 12px' : '12px 20px'};
        z-index: 999999;
        display: none;
        direction: ${getCurrentLanguage() === 'ar' ? 'rtl' : 'ltr'};
      `;
    
      const wrapper = document.createElement('div');
      wrapper.style.cssText = `
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: ${isMobile() ? '8px' : '15px'};
        flex-wrap: ${isMobile() ? 'wrap' : 'nowrap'};
      `;
    
      const quantityWrapper = document.createElement('div');
      quantityWrapper.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        background: #f5f5f5;
        border-radius: 4px;
        padding: 4px;
        ${isMobile() ? 'flex: 0 0 auto;' : ''}
      `;
      const decreaseBtn = document.createElement('button');
      decreaseBtn.textContent = '-';
      decreaseBtn.style.cssText = `
        width: ${isMobile() ? '24px' : '28px'};
        height: ${isMobile() ? '24px' : '28px'};
        display: flex;
        align-items: center;
        justify-content: center;
        background: white;
        border: 1px solid #e5e5e5;
        border-radius: 4px;
        cursor: pointer;
        font-size: ${isMobile() ? '14px' : '16px'};
        user-select: none;
      `;
    
      const quantityInput = document.createElement('input');
      quantityInput.type = 'number';
      quantityInput.min = '1';
      quantityInput.max = '10';
      quantityInput.value = '1';
      quantityInput.style.cssText = `
        width: ${isMobile() ? '36px' : '40px'};
        text-align: center;
        border: none;
        background: transparent;
        font-size: ${isMobile() ? '13px' : '14px'};
        -moz-appearance: textfield;
        -webkit-appearance: none;
        margin: 0 5px;
      `;
    
      const increaseBtn = document.createElement('button');
      increaseBtn.textContent = '+';
      increaseBtn.style.cssText = `
        width: ${isMobile() ? '24px' : '28px'};
        height: ${isMobile() ? '24px' : '28px'};
        display: flex;
        align-items: center;
        justify-content: center;
        background: white;
        border: 1px solid #e5e5e5;
        border-radius: 4px;
        cursor: pointer;
        font-size: ${isMobile() ? '14px' : '16px'};
        user-select: none;
      `;
    
      const updateQuantity = (value) => {
        quantityInput.value = value;
        const originalSelect = document.querySelector('select#product-quantity');
        if (originalSelect) {
          originalSelect.value = value;
          const event = new Event('change', { bubbles: true });
          originalSelect.dispatchEvent(event);
        }
      };
    
      decreaseBtn.addEventListener('click', () => {
        const currentValue = parseInt(quantityInput.value);
        if (currentValue > 1) {
          updateQuantity(currentValue - 1);
        }
      });
    
      increaseBtn.addEventListener('click', () => {
        const currentValue = parseInt(quantityInput.value);
        if (currentValue < 10) {
          updateQuantity(currentValue + 1);
        }
      });
    
      quantityInput.addEventListener('change', (e) => {
        let value = parseInt(e.target.value);
        if (isNaN(value) || value < 1) value = 1;
        if (value > 10) value = 10;
        updateQuantity(value);
      });
    
      const addButton = document.createElement('button');
      addButton.textContent = getCurrentLanguage() === 'ar' ? 'أضف للسلة' : 'Add to Cart';
      addButton.style.cssText = `
        background-color: var(--theme-primary, #00b286);
        color: white;
        border: none;
        border-radius: 4px;
        padding: 0 ${isMobile() ? '15px' : '30px'};
        height: ${isMobile() ? '36px' : '40px'};
        font-weight: 500;
        cursor: pointer;
        white-space: nowrap;
        transition: opacity 0.3s ease;
        flex-grow: 1;
        font-size: ${isMobile() ? '13px' : '14px'};
        ${isMobile() ? 'width: 100%;' : ''}
      `;
    
      addButton.addEventListener('mouseover', () => addButton.style.opacity = '0.9');
      addButton.addEventListener('mouseout', () => addButton.style.opacity = '1');
      addButton.addEventListener('click', () => {
        const originalSelect = document.querySelector('select#product-quantity');
        if (originalSelect) {
          originalSelect.value = quantityInput.value;
          const event = new Event('change', { bubbles: true });
          originalSelect.dispatchEvent(event);
        }
    
        const originalButton = document.querySelector('.btn.btn-add-to-cart');
        if (originalButton) {
          setTimeout(() => {
            originalButton.click();
          }, 100);
        }
      });
    
      quantityWrapper.appendChild(decreaseBtn);
      quantityWrapper.appendChild(quantityInput);
      quantityWrapper.appendChild(increaseBtn);
    
      wrapper.appendChild(quantityWrapper);
      wrapper.appendChild(addButton);
      container.appendChild(wrapper);
      document.body.appendChild(container);
    
      this.stickyCartElement = container;
    
      window.addEventListener('scroll', () => {
        const originalButton = document.querySelector('.btn.btn-add-to-cart');
        const originalSelect = document.querySelector('select#product-quantity');
        
        if (!originalButton) return;
    
        const buttonRect = originalButton.getBoundingClientRect();
        const isButtonVisible = buttonRect.top >= 0 && buttonRect.bottom <= window.innerHeight;
        
        if (!isButtonVisible) {
          container.style.display = 'block';
          if (originalSelect) {
            quantityInput.value = originalSelect.value;
          }
        } else {
          container.style.display = 'none';
        }
      });
    },
    findActiveCampaignForProduct(productId) {
      const now = new Date();
      const activeCampaign = this.campaigns.find(campaign => {
        if (!campaign.products || !Array.isArray(campaign.products)) {
          return false;
        }

        const hasProduct = campaign.products.some(p => p.id === productId);
        
        let endTime;
        try {
          endTime = campaign.endTime?._seconds ? 
            new Date(campaign.endTime._seconds * 1000) :
            new Date(campaign.endTime.seconds * 1000);
        } catch (error) {
          return false;
        }

        if (!(endTime instanceof Date && !isNaN(endTime))) {
          return false;
        }

        const isNotEnded = now <= endTime;
        const isActive = campaign.status === 'active';

        return hasProduct && isNotEnded && isActive;
      });

      return activeCampaign;
    },

    createCountdownTimer(campaign, productId) {
      const existingTimer = document.getElementById(`hmstudio-countdown-${productId}`);
      if (existingTimer) {
        existingTimer.remove();
        if (this.activeTimers.has(productId)) {
          clearInterval(this.activeTimers.get(productId));
          this.activeTimers.delete(productId);
        }
      }

      const container = document.createElement('div');
      container.id = `hmstudio-countdown-${productId}`;
      container.style.cssText = `
        background: ${campaign.timerSettings.backgroundColor};
        color: ${campaign.timerSettings.textColor};
        padding: ${isMobile() ? '8px 10px' : '12px 15px'};
        margin: ${isMobile() ? '10px 0' : '15px 0'};
        border-radius: 8px;
        text-align: center;
        direction: ${getCurrentLanguage() === 'ar' ? 'rtl' : 'ltr'};
        display: flex;
        align-items: center;
        justify-content: center;
        gap: ${isMobile() ? '8px' : '12px'};
        font-size: ${isMobile() ? '12px' : '14px'};
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        flex-wrap: ${isMobile() ? 'wrap' : 'nowrap'};
        width: ${isMobile() ? '100%' : 'auto'};
      `;

      const textElement = document.createElement('span');
      const timerText = getCurrentLanguage() === 'ar' ? 
        campaign.timerSettings.textAr : 
        campaign.timerSettings.textEn;
      textElement.textContent = timerText;
      textElement.style.cssText = `
        font-weight: 500;
        ${isMobile() ? 'width: 100%; margin-bottom: 4px;' : ''}
      `;
        
      const timeElement = document.createElement('div');
      timeElement.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: bold;
        padding: 4px 8px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.15);
        ${isMobile() ? 'width: 100%; justify-content: center;' : ''}
      `;

      container.appendChild(textElement);
      container.appendChild(timeElement);

      this.activeTimers.set(productId, {
        element: timeElement,
        endTime: campaign.endTime?._seconds ? 
          new Date(campaign.endTime._seconds * 1000) :
          new Date(campaign.endTime.seconds * 1000),
        campaign: campaign,
        lastUpdate: null,
        lastSeconds: null
      });

      return container;
    },

    createProductCardTimer(campaign, productId) {
      const existingTimer = document.getElementById(`hmstudio-card-countdown-${productId}`);
      if (existingTimer) {
        if (this.activeTimers.has(`card-${productId}`)) {
          clearInterval(this.activeTimers.get(`card-${productId}`));
          this.activeTimers.delete(`card-${productId}`);
        }
        existingTimer.remove();
      }

      const container = document.createElement('div');
      container.id = `hmstudio-card-countdown-${productId}`;
      container.style.cssText = `
        background: ${campaign.timerSettings.backgroundColor};
        color: ${campaign.timerSettings.textColor};
        padding: 4px;
        margin-top: -4px;
        border-bottom-right-radius: 8px;
        border-bottom-left-radius: 8px;
        text-align: center;
        direction: ${getCurrentLanguage() === 'ar' ? 'rtl' : 'ltr'};
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        font-size: ${isMobile() ? '11px' : '13px'};
        width: 100%;
        position: relative;
        z-index: 10;
      `;

      const timeElement = document.createElement('div');
      timeElement.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        gap: ${isMobile() ? '2px' : '4px'};
      `;

      container.appendChild(timeElement);

      this.activeTimers.set(`card-${productId}`, {
        element: timeElement,
        endTime: campaign.endTime?._seconds ? 
          new Date(campaign.endTime._seconds * 1000) :
          new Date(campaign.endTime.seconds * 1000),
        campaign: campaign,
        lastUpdate: null,
        lastSeconds: null
      });

      return container;
    },
    updateAllTimers() {
      // Throttle updates to every 1000ms
      if (this._updating) return;
      this._updating = true;

      const now = new Date();
      let needsUpdate = false;
      
      this.activeTimers.forEach((timer, id) => {
        if (!timer.element || !timer.endTime || !timer.campaign) return;

        let timeDiff = timer.endTime - now;

        if (timeDiff <= 0) {
          if (timer.campaign.timerSettings?.autoRestart) {
            const duration = 
              (timer.campaign.duration.days * 24 * 60 * 60 * 1000) +
              (timer.campaign.duration.hours * 60 * 60 * 1000) +
              (timer.campaign.duration.minutes * 60 * 1000) +
              (timer.campaign.duration.seconds * 1000);

            const cycles = Math.floor(Math.abs(timeDiff) / duration) + 1;
            timer.endTime = new Date(timer.endTime.getTime() + (duration * cycles));
            timeDiff = timer.endTime - now;
            needsUpdate = true;
          } else {
            const elementId = id.startsWith('card-') ? 
              `hmstudio-card-countdown-${id.replace('card-', '')}` :
              `hmstudio-countdown-${id}`;
            const element = document.getElementById(elementId);
            if (element) element.remove();
            this.activeTimers.delete(id);
            return;
          }
        }

        // Only update if time has changed significantly
        if (!timer.lastUpdate || now - timer.lastUpdate >= 1000) {
          const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

          if (timer.lastSeconds !== seconds || needsUpdate) {
            let html = '';
            const timeUnits = [];

            if (days > 0) timeUnits.push({ value: days, label: getCurrentLanguage() === 'ar' ? 'ي' : 'd' });
            if (hours > 0 || days > 0) timeUnits.push({ value: hours, label: getCurrentLanguage() === 'ar' ? 'س' : 'h' });
            if (minutes > 0 || hours > 0 || days > 0) timeUnits.push({ value: minutes, label: getCurrentLanguage() === 'ar' ? 'د' : 'm' });
            timeUnits.push({ value: seconds, label: getCurrentLanguage() === 'ar' ? 'ث' : 's' });

            timeUnits.forEach((unit, index) => {
              html += `
                <div class="hmstudio-card-countdown-unit" style="
                  display: inline-flex;
                  align-items: center;
                  gap: ${isMobile() ? '1px' : '2px'};
                  ${index < timeUnits.length - 1 ? `margin-${getCurrentLanguage() === 'ar' ? 'left' : 'right'}: ${isMobile() ? '4px' : '8px'};` : ''}
                ">
                  <span style="
                    font-weight: bold;
                    min-width: ${isMobile() ? '16px' : '20px'};
                    text-align: center;
                  ">${String(unit.value).padStart(2, '0')}</span>
                  <span style="
                    font-size: ${isMobile() ? '0.8em' : '0.9em'};
                    opacity: 0.8;
                  ">${unit.label}</span>
                  ${index < timeUnits.length - 1 ? `
                    <span style="
                      margin-${getCurrentLanguage() === 'ar' ? 'right' : 'left'}: ${isMobile() ? '4px' : '8px'};
                      opacity: 0.8;
                    ">:</span>
                  ` : ''}
                </div>
              `;
            });

            timer.element.innerHTML = html;
            timer.lastUpdate = now;
            timer.lastSeconds = seconds;
          }
        }
      });

      setTimeout(() => {
        this._updating = false;
      }, 50);
    },

    setupProductTimer() {
      console.log('Setting up product timer...');

      let productId;
      const wishlistBtn = document.querySelector('[data-wishlist-id]');
      if (wishlistBtn) {
        productId = wishlistBtn.getAttribute('data-wishlist-id');
      }

      if (!productId) {
        const productForm = document.querySelector('form[data-product-id]');
        if (productForm) {
          productId = productForm.getAttribute('data-product-id');
        }
      }

      if (!productId) {
        return;
      }

      this.currentProductId = productId;
      const activeCampaign = this.findActiveCampaignForProduct(productId);

      if (activeCampaign) {
        const timer = this.createCountdownTimer(activeCampaign, productId);

        const priceSelectors = [
          'h2.product-formatted-price.theme-text-primary',
          '.product-formatted-price',
          '.product-formatted-price.theme-text-primary',
          '.product-price',
          'h2.theme-text-primary',
          '.theme-text-primary'
        ];

        let inserted = false;
        for (const selector of priceSelectors) {
          const priceContainer = document.querySelector(selector);
          
          if (priceContainer?.parentElement) {
            priceContainer.parentElement.insertBefore(timer, priceContainer);
            inserted = true;
            break;
          }
        }

        if (!inserted) {
          const productDetails = document.querySelector('.products-details');
          if (productDetails) {
            productDetails.insertBefore(timer, productDetails.firstChild);
          }
        }
      }
    },
    setupProductCardTimers() {
      const productCards = document.querySelectorAll('.product-item');
      const processedCards = new Set();
      let batchTimeout;

      // Process cards in batches
      const processBatch = (cards, startIndex) => {
        const batchSize = 5;
        const endIndex = Math.min(startIndex + batchSize, cards.length);

        for (let i = startIndex; i < endIndex; i++) {
          const card = cards[i];
          let productId = null;
          const wishlistBtn = card.querySelector('[data-wishlist-id]');
          if (wishlistBtn) {
            productId = wishlistBtn.getAttribute('data-wishlist-id');
          }

          if (productId && !processedCards.has(productId)) {
            processedCards.add(productId);
            const activeCampaign = this.findActiveCampaignForProduct(productId);
            if (activeCampaign) {
              const timer = this.createProductCardTimer(activeCampaign, productId);
              const contentContainer = card.querySelector('.content');
              if (contentContainer && !document.getElementById(`hmstudio-card-countdown-${productId}`)) {
                contentContainer.parentNode.insertBefore(timer, contentContainer.nextSibling);
              }
            }
          }
        }

        if (endIndex < cards.length) {
          batchTimeout = setTimeout(() => processBatch(cards, endIndex), 50);
        }
      };

      // Clear any existing batch timeout
      if (batchTimeout) {
        clearTimeout(batchTimeout);
      }

      // Start processing in batches
      processBatch(Array.from(productCards), 0);
    },

    startTimerUpdates() {
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
      }
      // Reduce update frequency to 1 second
      this.updateInterval = setInterval(() => this.updateAllTimers(), 1000);
      this.updateAllTimers(); // Initial update
    },

    stopTimerUpdates() {
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
    },

    initialize() {
      console.log('Initializing Smart Cart with campaigns:', this.campaigns);
      
      this.stopTimerUpdates();

      // Delay initial setup slightly to allow page to settle
      setTimeout(() => {
        if (document.querySelector('.product.products-details-page')) {
          console.log('On product page');
          this.setupProductTimer();
          this.createStickyCart();
        }
        
        if (document.querySelectorAll('.product-item').length > 0) {
          console.log('Found product cards, setting up timers');
          this.setupProductCardTimers();
        }

        if (this.activeTimers.size > 0) {
          console.log('Starting timer updates');
          this.startTimerUpdates();
        }

        // Set up a throttled mutation observer
        let timeout;
        const observer = new MutationObserver((mutations) => {
          if (timeout) {
            clearTimeout(timeout);
          }
          timeout = setTimeout(() => {
            const productPage = document.querySelector('.product.products-details-page');
            const productCards = document.querySelectorAll('.product-item');

            if (productPage) {
              if (!document.getElementById('hmstudio-sticky-cart')) {
                this.createStickyCart();
              }
              if (this.currentProductId && !document.getElementById(`hmstudio-countdown-${this.currentProductId}`)) {
                this.setupProductTimer();
              }
            }

            if (productCards.length > 0) {
              this.setupProductCardTimers();
            }

            if (!this.updateInterval && this.activeTimers.size > 0) {
              this.startTimerUpdates();
            }
          }, 100);
        });

        observer.observe(document.body, { 
          childList: true, 
          subtree: true 
        });

        // Add resize handler for mobile responsiveness
        let resizeTimeout;
        window.addEventListener('resize', () => {
          if (resizeTimeout) {
            clearTimeout(resizeTimeout);
          }
          resizeTimeout = setTimeout(() => {
            if (document.querySelector('.product.products-details-page')) {
              this.createStickyCart();
            }
            // Refresh timers to update mobile/desktop styles
            this.activeTimers.forEach((timer, id) => {
              if (id.startsWith('card-')) {
                const productId = id.replace('card-', '');
                const existingTimer = document.getElementById(`hmstudio-card-countdown-${productId}`);
                if (existingTimer && timer.campaign) {
                  const newTimer = this.createProductCardTimer(timer.campaign, productId);
                  existingTimer.parentNode.replaceChild(newTimer, existingTimer);
                }
              }
            });
          }, 250);
        });
      }, 100);
    }
  };

  window.addEventListener('beforeunload', () => {
    SmartCart.stopTimerUpdates();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SmartCart.initialize());
  } else {
    SmartCart.initialize();
  }
})();
