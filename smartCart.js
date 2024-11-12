// src/scripts/smartCart.js v1.4.2
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
                textEn: decodeURIComponent(campaign.timerSettings.textEn || '')
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

  const storeId = getStoreIdFromUrl();
  if (!storeId) {
    console.error('Store ID not found in script URL');
    return;
  }

  // Add CSS styles to the document
  const styles = `
    .hmstudio-card-countdown {
      --countdown-bg-color: rgba(0, 0, 0, 0.8);
      --countdown-text-color: #ffffff;
      --countdown-font-size: 14px;
      --countdown-padding: 8px;
      --countdown-margin: 8px 0;
      --countdown-border-radius: 4px;
      --countdown-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

      background-color: var(--countdown-bg-color);
      color: var(--countdown-text-color);
      font-size: var(--countdown-font-size);
      padding: var(--countdown-padding);
      margin: var(--countdown-margin);
      border-radius: var(--countdown-border-radius);
      box-shadow: var(--countdown-shadow);
      text-align: center;
    }

    .hmstudio-card-countdown-unit {
      display: inline-flex;
      align-items: center;
      gap: 2px;
    }

    .hmstudio-card-countdown-value {
      font-weight: bold;
      min-width: 20px;
      text-align: center;
    }

    .hmstudio-card-countdown-label {
      font-size: 0.8em;
      opacity: 0.8;
    }

    .hmstudio-card-countdown-separator {
      margin: 0 4px;
      opacity: 0.8;
    }

    html[dir="rtl"] .hmstudio-card-countdown {
      direction: rtl;
    }
  `;

  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  const SmartCart = {
    settings: null,
    campaigns: getCampaignsFromUrl(),
    stickyCartElement: null,
    currentProductId: null,
    activeTimers: new Map(),

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
        padding: 12px 20px;
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
        gap: 15px;
      `;
    
      const quantityWrapper = document.createElement('div');
      quantityWrapper.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        background: #f5f5f5;
        border-radius: 4px;
        padding: 4px;
      `;
    
      const decreaseBtn = document.createElement('button');
      decreaseBtn.textContent = '-';
      decreaseBtn.style.cssText = `
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: white;
        border: 1px solid #e5e5e5;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
        user-select: none;
      `;
    
      const quantityInput = document.createElement('input');
      quantityInput.type = 'number';
      quantityInput.min = '1';
      quantityInput.max = '10';
      quantityInput.value = '1';
      quantityInput.style.cssText = `
        width: 40px;
        text-align: center;
        border: none;
        background: transparent;
        font-size: 14px;
        -moz-appearance: textfield;
        -webkit-appearance: none;
        margin: 0 5px;
      `;
    
      const increaseBtn = document.createElement('button');
      increaseBtn.textContent = '+';
      increaseBtn.style.cssText = `
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: white;
        border: 1px solid #e5e5e5;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
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
        padding: 0 30px;
        height: 40px;
        font-weight: 500;
        cursor: pointer;
        white-space: nowrap;
        transition: opacity 0.3s ease;
        flex-grow: 1;
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
        padding: 12px 15px;
        margin: 15px 0;
        border-radius: 8px;
        text-align: center;
        direction: ${getCurrentLanguage() === 'ar' ? 'rtl' : 'ltr'};
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        font-size: 14px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      `;

      const textElement = document.createElement('span');
      const timerText = getCurrentLanguage() === 'ar' ? 
        campaign.timerSettings.textAr : 
        campaign.timerSettings.textEn;
      textElement.textContent = timerText;
      textElement.style.fontWeight = '500';
        
      const timeElement = document.createElement('div');
      timeElement.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: bold;
        padding: 4px 8px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.15);
      `;

      container.appendChild(textElement);
      container.appendChild(timeElement);

      let endTime;
      try {
        endTime = campaign.endTime?._seconds ? 
          new Date(campaign.endTime._seconds * 1000) :
          new Date(campaign.endTime.seconds * 1000);
      } catch (error) {
        console.error('Error parsing end time:', error);
        return container;
      }

      const updateTimer = () => {
        const now = new Date();
        const timeDiff = endTime - now;

        if (timeDiff <= 0) {
          container.remove();
          clearInterval(timerInterval);
          this.activeTimers.delete(productId);
          return;
        }

        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

        let timeUnits = [];

        if (days > 0) {
          timeUnits.push({
            value: days,
            label: getCurrentLanguage() === 'ar' ? 'ي' : 'd'
          });
        }

        if (hours > 0 || days > 0) {
          timeUnits.push({
            value: hours,
            label: getCurrentLanguage() === 'ar' ? 'س' : 'h'
          });
        }

        if (minutes > 0 || hours > 0 || days > 0) {
          timeUnits.push({
            value: minutes,
            label: getCurrentLanguage() === 'ar' ? 'د' : 'm'
          });
        }

        timeUnits.push({
          value: seconds,
          label: getCurrentLanguage() === 'ar' ? 'ث' : 's'
        });

        timeElement.innerHTML = '';

        timeUnits.forEach((unit, index) => {
          const unitContainer = document.createElement('div');
          unitContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 2px;
          `;

          const valueSpan = document.createElement('span');
          valueSpan.textContent = String(unit.value).padStart(2, '0');
          valueSpan.style.minWidth = '20px';

          const labelSpan = document.createElement('span');
          labelSpan.textContent = unit.label;
          labelSpan.style.cssText = `
            font-size: 12px;
            opacity: 0.8;
          `;

          unitContainer.appendChild(valueSpan);
          unitContainer.appendChild(labelSpan);

          if (index < timeUnits.length - 1) {
            unitContainer.style.marginRight = '8px';
            
            const separator = document.createElement('span');
            separator.textContent = ':';
            separator.style.marginLeft = '8px';
            unitContainer.appendChild(separator);
          }

          timeElement.appendChild(unitContainer);
        });
      };

      updateTimer();
      const timerInterval = setInterval(updateTimer, 1000);
      this.activeTimers.set(productId, timerInterval);

      return container;
    },

    createProductCardTimer(campaign, productId) {
      const existingTimer = document.getElementById(`hmstudio-card-countdown-${productId}`);
      if (existingTimer) {
        existingTimer.remove();
        if (this.activeTimers.has(`card-${productId}`)) {
          clearInterval(this.activeTimers.get(`card-${productId}`));
          this.activeTimers.delete(`card-${productId}`);
        }
      }

      const container = document.createElement('div');
      container.id = `hmstudio-card-countdown-${productId}`;
      container.className = 'hmstudio-card-countdown';

      const timeElement = document.createElement('div');
      timeElement.className = 'hmstudio-card-countdown-time';
      timeElement.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
      `;

      container.appendChild(timeElement);

      let endTime;
      try {
        endTime = campaign.endTime?._seconds ? 
          new Date(campaign.endTime._seconds * 1000) :
          new Date(campaign.endTime.seconds * 1000);
      } catch (error) {
        console.error('Error parsing end time:', error);
        return container;
      }

      const updateTimer = () => {
        const now = new Date();
        const timeDiff = endTime - now;

        if (timeDiff <= 0) {
          container.remove();
          clearInterval(timerInterval);
          this.activeTimers.delete(`card-${productId}`);
          return;
        }

        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

        let timeUnits = [];

        if (days > 0) {
          timeUnits.push({
            value: days,
            label: getCurrentLanguage() === 'ar' ? 'ي' : 'd'
          });
        }

        if (hours > 0 || days > 0) {
          timeUnits.push({
            value: hours,
            label: getCurrentLanguage() === 'ar' ? 'س' : 'h'
          });
        }

        if (minutes > 0 || hours > 0 || days > 0) {
          timeUnits.push({
            value: minutes,
            label: getCurrentLanguage() === 'ar' ? 'د' : 'm'
          });
        }

        timeUnits.push({
          value: seconds,
          label: getCurrentLanguage() === 'ar' ? 'ث' : 's'
        });

        timeElement.innerHTML = '';

        timeUnits.forEach((unit, index) => {
          const unitContainer = document.createElement('div');
          unitContainer.className = 'hmstudio-card-countdown-unit';

          const valueSpan = document.createElement('span');
          valueSpan.className = 'hmstudio-card-countdown-value';
          valueSpan.textContent = String(unit.value).padStart(2, '0');

          const labelSpan = document.createElement('span');
          labelSpan.className = 'hmstudio-card-countdown-label';
          labelSpan.textContent = unit.label;

          unitContainer.appendChild(valueSpan);
          unitContainer.appendChild(labelSpan);

          if (index < timeUnits.length - 1) {
            const separator = document.createElement('span');
            separator.className = 'hmstudio-card-countdown-separator';
            separator.textContent = ':';
            unitContainer.appendChild(separator);
          }

          timeElement.appendChild(unitContainer);
        });
      };

      updateTimer();
      const timerInterval = setInterval(updateTimer, 1000);
      this.activeTimers.set(`card-${productId}`, timerInterval);

      return container;
    },

    setupProductTimer() {
      console.log('Setting up product timer...');

      if (this.activeTimers.size > 0) {
        console.log('Clearing existing timers');
        this.activeTimers.forEach((interval, productId) => {
          clearInterval(interval);
          const timer = document.getElementById(`hmstudio-countdown-${productId}`);
          if (timer) timer.remove();
        });
        this.activeTimers.clear();
      }

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

      if (!activeCampaign) {
        return;
      }

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
    },

    setupProductCardTimers() {
      const productCards = document.querySelectorAll('.product-item');
      
      productCards.forEach(card => {
        let productId = null;
        const wishlistBtn = card.querySelector('[data-wishlist-id]');
        if (wishlistBtn) {
          productId = wishlistBtn.getAttribute('data-wishlist-id');
        }

        if (productId) {
          const activeCampaign = this.findActiveCampaignForProduct(productId);
          if (activeCampaign) {
            const timer = this.createProductCardTimer(activeCampaign, productId);
            const imageContainer = card.querySelector('.content');
            if (imageContainer) {
              imageContainer.parentNode.insertBefore(timer, imageContainer.nextSibling);
            }
          }
        }
      });
    },

    initialize() {
      console.log('Initializing Smart Cart with campaigns:', this.campaigns);
      
      if (document.querySelector('.product.products-details-page')) {
        console.log('On product page, setting up product timer');
        this.setupProductTimer();
        this.createStickyCart();

        const observer = new MutationObserver(() => {
          if (!document.getElementById(`hmstudio-countdown-${this.currentProductId}`)) {
            this.setupProductTimer();
          }
        });

        observer.observe(document.body, { childList: true, subtree: true });
      } else if (document.querySelector('.product-item')) {
        console.log('On product listing page, setting up card timers');
        this.setupProductCardTimers();

        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
              this.setupProductCardTimers();
            }
          });
        });

        observer.observe(document.body, { childList: true, subtree: true });
      }
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SmartCart.initialize());
  } else {
    SmartCart.initialize();
  }
})();
