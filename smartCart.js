// src/scripts/smartCart.js v1.4.3
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

    createProductCardTimer(campaign, productId) {
      const existingTimer = document.getElementById(`hmstudio-card-countdown-${productId}`);
      if (existingTimer) {
        return existingTimer;
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

      this.activeTimers.set(`card-${productId}`, {
        element: timeElement,
        endTime: campaign.endTime?._seconds ? 
          new Date(campaign.endTime._seconds * 1000) :
          new Date(campaign.endTime.seconds * 1000)
      });

      return container;
    },

    updateAllTimers() {
      const now = new Date();
      
      this.activeTimers.forEach((timer, id) => {
        if (!timer.element || !timer.endTime) return;

        const timeDiff = timer.endTime - now;

        if (timeDiff <= 0) {
          const elementId = id.startsWith('card-') ? 
            `hmstudio-card-countdown-${id.replace('card-', '')}` :
            `hmstudio-countdown-${id}`;
          const element = document.getElementById(elementId);
          if (element) element.remove();
          this.activeTimers.delete(id);
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

        let html = '';
        timeUnits.forEach((unit, index) => {
          html += `
            <div class="hmstudio-card-countdown-unit">
              <span class="hmstudio-card-countdown-value">${String(unit.value).padStart(2, '0')}</span>
              <span class="hmstudio-card-countdown-label">${unit.label}</span>
              ${index < timeUnits.length - 1 ? '<span class="hmstudio-card-countdown-separator">:</span>' : ''}
            </div>
          `;
        });

        timer.element.innerHTML = html;
      });
    },

    setupProductCardTimers() {
      const productCards = document.querySelectorAll('.product-item');
      const processedCards = new Set();
      
      productCards.forEach(card => {
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
            const imageContainer = card.querySelector('.content');
            if (imageContainer && !document.getElementById(`hmstudio-card-countdown-${productId}`)) {
              imageContainer.parentNode.insertBefore(timer, imageContainer.nextSibling);
            }
          }
        }
      });
    },

    startTimerUpdates() {
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
      }
      this.updateInterval = setInterval(() => this.updateAllTimers(), 1000);
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
      
      if (document.querySelector('.product.products-details-page')) {
        console.log('On product page, setting up product timer');
        this.setupProductTimer();
        this.createStickyCart();

        if (this.activeTimers.size > 0) {
          this.startTimerUpdates();
        }

        const observer = new MutationObserver((mutations) => {
          if (!document.getElementById(`hmstudio-countdown-${this.currentProductId}`)) {
            this.setupProductTimer();
            if (this.activeTimers.size > 0 && !this.updateInterval) {
              this.startTimerUpdates();
            }
          }
        });

        observer.observe(document.body, { childList: true, subtree: true });
      } else if (document.querySelector('.product-item')) {
        console.log('On product listing page, setting up card timers');
        this.setupProductCardTimers();

        if (this.activeTimers.size > 0) {
          this.startTimerUpdates();
        }

        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
              this.setupProductCardTimers();
              if (this.activeTimers.size > 0 && !this.updateInterval) {
                this.startTimerUpdates();
              }
            }
          });
        });

        observer.observe(document.body, { childList: true, subtree: true });
      }
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
