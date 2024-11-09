// src/scripts/smartCart.js 
// HMStudio Smart Cart v1.0.9
// Created by HMStudio

(function() {
  console.log('Smart Cart script initialized');

  function getStoreIdFromUrl() {
    const scriptTag = document.currentScript;
    const scriptUrl = new URL(scriptTag.src);
    const storeId = scriptUrl.searchParams.get('storeId');
    return storeId ? storeId.split('?')[0] : null;
  }

  function getCurrentLanguage() {
    return document.documentElement.lang || 'ar';
  }

  const storeId = getStoreIdFromUrl();
  if (!storeId) {
    console.error('Store ID not found in script URL');
    return;
  }

  const SmartCart = {
    settings: null,
    campaigns: [],
    stickyCartElement: null,
    currentProductId: null,
    activeCampaignTimer: null,

    async fetchSettings() {
      try {
        const response = await fetch(`https://europe-west3-hmstudio-85f42.cloudfunctions.net/getSmartCartSettings?storeId=${storeId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch settings: ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Fetched Smart Cart settings:', data);
        this.settings = data;
        this.campaigns = data.campaigns || [];
        return data;
      } catch (error) {
        console.error('Error fetching Smart Cart settings:', error);
        return null;
      }
    },

    findActiveCampaignForProduct(productId) {
      const now = new Date();
      return this.campaigns.find(campaign => {
        const startDate = new Date(campaign.startDate.seconds * 1000);
        const endDate = new Date(campaign.endDate.seconds * 1000);
        const isActive = now >= startDate && now <= endDate;
        const includesProduct = campaign.products.some(p => p.id === productId);
        return isActive && includesProduct && campaign.status === 'active';
      });
    },

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
        justify-content: center;
        gap: 15px;
      `;

      // Add to cart button
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
      `;

      addButton.addEventListener('mouseover', () => addButton.style.opacity = '0.9');
      addButton.addEventListener('mouseout', () => addButton.style.opacity = '1');
      addButton.addEventListener('click', () => {
        const originalButton = document.querySelector('.btn.btn-add-to-cart');
        if (originalButton) {
          originalButton.click();
        }
      });

      wrapper.appendChild(addButton);
      container.appendChild(wrapper);
      document.body.appendChild(container);

      this.stickyCartElement = container;

      // Show/hide on scroll
      window.addEventListener('scroll', () => {
        const originalButton = document.querySelector('.btn.btn-add-to-cart');
        if (!originalButton) return;

        const buttonRect = originalButton.getBoundingClientRect();
        const isButtonVisible = buttonRect.top >= 0 && buttonRect.bottom <= window.innerHeight;
        container.style.display = !isButtonVisible ? 'block' : 'none';
      });
    },

    createCountdownTimer(campaign) {
      const container = document.createElement('div');
      container.id = 'hmstudio-countdown-timer';
      container.style.cssText = `
        background: ${campaign.timerSettings.backgroundColor};
        color: ${campaign.timerSettings.textColor};
        padding: 12px 15px;
        margin-bottom: 15px;
        border-radius: 4px;
        text-align: center;
        direction: ${getCurrentLanguage() === 'ar' ? 'rtl' : 'ltr'};
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 14px;
      `;

      const textElement = document.createElement('span');
      textElement.textContent = campaign.timerSettings.text;
      
      const timeElement = document.createElement('span');
      timeElement.style.cssText = `
        font-weight: bold;
        padding: 2px 6px;
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.1);
      `;

      container.appendChild(textElement);
      container.appendChild(timeElement);

      const endDate = new Date(campaign.endDate.seconds * 1000);

      const updateTimer = () => {
        const now = new Date();
        const timeDiff = endDate - now;

        if (timeDiff <= 0) {
          container.remove();
          clearInterval(timerInterval);
          return;
        }

        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

        timeElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      };

      // Initial update and start interval
      updateTimer();
      const timerInterval = setInterval(updateTimer, 1000);

      return { container, interval: timerInterval };
    },

    setupCountdownTimer() {
      // Clear any existing timer
      if (this.activeCampaignTimer) {
        clearInterval(this.activeCampaignTimer.interval);
        this.activeCampaignTimer.container.remove();
        this.activeCampaignTimer = null;
      }

      // Get current product ID
      const productForm = document.querySelector('form[data-product-id]');
      if (!productForm) return;
      
      this.currentProductId = productForm.getAttribute('data-product-id');
      
      // Find active campaign for this product
      const activeCampaign = this.findActiveCampaignForProduct(this.currentProductId);
      if (!activeCampaign) return;

      // Create and insert timer
      const timerElements = this.createCountdownTimer(activeCampaign);
      this.activeCampaignTimer = timerElements;

      // Insert before price element
      const priceContainer = document.querySelector('.product-formatted-price.theme-text-primary')?.parentElement;
      if (priceContainer) {
        priceContainer.parentElement.insertBefore(timerElements.container, priceContainer);
      }
    },

    initialize() {
      console.log('Initializing Smart Cart');
      
      // Check if we're on a product page
      if (!document.querySelector('.product.products-details-page')) {
        console.log('Not a product page, skipping initialization');
        return;
      }

      // Initialize features
      this.fetchSettings().then(settings => {
        if (settings?.enabled) {
          console.log('Smart Cart is enabled, initializing features');
          this.createStickyCart();
          this.setupCountdownTimer();

          // Set up observer for dynamic content changes
          const observer = new MutationObserver(() => {
            if (!document.getElementById('hmstudio-countdown-timer')) {
              this.setupCountdownTimer();
            }
          });

          observer.observe(document.body, { childList: true, subtree: true });
        }
      });
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SmartCart.initialize());
  } else {
    SmartCart.initialize();
  }
})();
