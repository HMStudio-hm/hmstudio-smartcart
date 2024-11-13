// src/scripts/smartCart.js v1.5.9
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
        campaign: campaign
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
        margin-top: 30px !important;
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
        campaign: campaign
      });

      return container;
    },

    updateAllTimers() {
      const now = new Date();
      let timerUpdateRequired = false;
      
      // Use requestAnimationFrame for smoother updates
      const updateTimers = () => {
        this.activeTimers.forEach((timer, id) => {
          if (!timer?.element || !timer?.endTime || !timer?.campaign) return;

          const timeDiff = timer.endTime - now;

          if (timeDiff <= 0) {
            if (timer.campaign.timerSettings?.autoRestart) {
              const duration = 
                (timer.campaign.duration.days * 24 * 60 * 60 * 1000) +
                (timer.campaign.duration.hours * 60 * 60 * 1000) +
                (timer.campaign.duration.minutes * 60 * 1000) +
                (timer.campaign.duration.seconds * 1000);

              timer.endTime = new Date(now.getTime() + duration);
              timerUpdateRequired = true;
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

          // Only update if seconds have changed
          const currentSecond = Math.floor(timeDiff / 1000);
          if (timer._lastSecond === currentSecond) return;
          timer._lastSecond = currentSecond;

          const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

          const isArabic = getCurrentLanguage() === 'ar';
          const isMobileView = isMobile();

          const timeSegments = [];
          
          if (days > 0) {
            timeSegments.push({
              value: String(days).padStart(2, '0'),
              label: isArabic ? 'ي' : 'd'
            });
          }
          if (hours > 0 || days > 0) {
            timeSegments.push({
              value: String(hours).padStart(2, '0'),
              label: isArabic ? 'س' : 'h'
            });
          }
          if (minutes > 0 || hours > 0 || days > 0) {
            timeSegments.push({
              value: String(minutes).padStart(2, '0'),
              label: isArabic ? 'د' : 'm'
            });
          }
          timeSegments.push({
            value: String(seconds).padStart(2, '0'),
            label: isArabic ? 'ث' : 's'
          });

          if (timer.element) {
            timer.element.innerHTML = timeSegments
              .map((segment, index) => `
                <span style="display:inline-flex;align-items:center;gap:2px">
                  <span style="font-weight:bold;min-width:20px;text-align:center">
                    ${segment.value}
                  </span>
                  <span style="font-size:${isMobileView ? '0.8em' : '0.9em'};opacity:0.8">
                    ${segment.label}
                  </span>
                  ${index < timeSegments.length - 1 ? '<span style="margin:0 4px">:</span>' : ''}
                </span>
              `).join('');
          }
        });

        if (timerUpdateRequired) {
          requestAnimationFrame(updateTimers);
        }
      };

      updateTimers();
    },

    startTimerUpdates() {
      if (this.updateInterval) {
        this.stopTimerUpdates();
      }

      this.updateInterval = setInterval(() => {
        requestAnimationFrame(() => this.updateAllTimers());
      }, 1000);
    },

    stopTimerUpdates() {
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
    },

    setupProductTimer() {
      if (this.currentProductId) {
        const activeCampaign = this.findActiveCampaignForProduct(this.currentProductId);
        if (activeCampaign) {
          const timer = this.createCountdownTimer(activeCampaign, this.currentProductId);
          if (timer) {
            const priceContainer = document.querySelector([
              'h2.product-formatted-price.theme-text-primary',
              '.product-formatted-price',
              '.product-formatted-price.theme-text-primary',
              '.product-price',
              'h2.theme-text-primary',
              '.theme-text-primary'
            ].join(','));

            if (priceContainer?.parentElement) {
              priceContainer.parentElement.insertBefore(timer, priceContainer);
            } else {
              const productDetails = document.querySelector('.products-details');
              if (productDetails) {
                productDetails.insertBefore(timer, productDetails.firstChild);
              }
            }
          }
        }
      }
    },

    setupProductCardTimers() {
      const processedCards = new Set();
      document.querySelectorAll('.product-item').forEach(card => {
        const wishlistBtn = card.querySelector('[data-wishlist-id]');
        if (!wishlistBtn) return;

        const productId = wishlistBtn.getAttribute('data-wishlist-id');
        if (!productId || processedCards.has(productId)) return;

        processedCards.add(productId);
        const activeCampaign = this.findActiveCampaignForProduct(productId);
        if (!activeCampaign) return;

        const imageContainer = card.querySelector('.content');
        if (!imageContainer || document.getElementById(`hmstudio-card-countdown-${productId}`)) return;

        const timer = this.createProductCardTimer(activeCampaign, productId);
        imageContainer.parentNode.insertBefore(timer, imageContainer.nextSibling);
      });
    },

    findActiveCampaignForProduct(productId) {
      if (!productId) return null;
      
      const now = new Date();
      return this.campaigns.find(campaign => {
        if (!campaign?.products?.length) return false;

        const hasProduct = campaign.products.some(p => p.id === productId);
        if (!hasProduct) return false;

        let endTime;
        try {
          endTime = campaign.endTime?._seconds ? 
            new Date(campaign.endTime._seconds * 1000) :
            new Date(campaign.endTime.seconds * 1000);
        } catch (error) {
          return false;
        }

        if (!(endTime instanceof Date && !isNaN(endTime))) return false;

        return campaign.status === 'active';
      });
    },

    createCountdownTimer(campaign, productId) {
      const existingTimer = document.getElementById(`hmstudio-countdown-${productId}`);
      if (existingTimer) {
        if (this.activeTimers.has(productId)) {
          clearInterval(this.activeTimers.get(productId));
          this.activeTimers.delete(productId);
        }
        existingTimer.remove();
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
        campaign: campaign
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
        margin-top: 30px !important;
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
        campaign: campaign
      });

      return container;
    },
    initialize() {
      console.log('Initializing Smart Cart with campaigns:', this.campaigns);
      
      // Only set up timers if we have campaigns
      if (this.campaigns.length > 0) {
        if (document.querySelector('.product.products-details-page')) {
          this.createStickyCart();
          this.setupProductTimer();
        } else if (document.querySelector('.product-item')) {
          this.setupProductCardTimers();
        }

        if (this.activeTimers.size > 0) {
          this.startTimerUpdates();
        }
      } else {
        // If no campaigns, just set up sticky cart on product pages
        if (document.querySelector('.product.products-details-page')) {
          this.createStickyCart();
        }
      }

      // Set up mutation observer for dynamic content
      const observer = new MutationObserver(() => {
        if (document.querySelector('.product.products-details-page')) {
          if (!document.getElementById('hmstudio-sticky-cart')) {
            this.createStickyCart();
          }
          if (this.currentProductId && !document.getElementById(`hmstudio-countdown-${this.currentProductId}`)) {
            const activeCampaign = this.findActiveCampaignForProduct(this.currentProductId);
            if (activeCampaign) {
              this.setupProductTimer();
              if (this.activeTimers.size > 0 && !this.updateInterval) {
                this.startTimerUpdates();
              }
            }
          }
        } else if (document.querySelector('.product-item') && this.campaigns.length > 0) {
          this.setupProductCardTimers();
          if (this.activeTimers.size > 0 && !this.updateInterval) {
            this.startTimerUpdates();
          }
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      // Clean up timers when page is hidden or unloaded
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.stopTimerUpdates();
        } else {
          if (this.activeTimers.size > 0) {
            this.startTimerUpdates();
          }
        }
      });
    }
  };

  // Handle page unload
  window.addEventListener('beforeunload', () => {
    SmartCart.stopTimerUpdates();
  });

  // Handle mobile viewport changes
  let resizeTimeout;
  window.addEventListener('resize', () => {
    // Debounce resize event
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (SmartCart.stickyCartElement) {
        SmartCart.createStickyCart();
      }
    }, 250); // Wait 250ms after last resize event
  });

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      try {
        SmartCart.initialize();
      } catch (error) {
        console.error('Error initializing SmartCart:', error);
      }
    });
  } else {
    try {
      SmartCart.initialize();
    } catch (error) {
      console.error('Error initializing SmartCart:', error);
    }
  }
})();
