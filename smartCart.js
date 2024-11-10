// src/scripts/smartCart.js v1.1.8
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
    console.log('Raw campaigns data:', campaignsData);

    if (!campaignsData) {
      console.log('No campaigns data found in URL');
      return [];
    }

    try {
      const decodedData = atob(campaignsData);
      console.log('Decoded campaigns data:', decodedData);
      const parsedData = JSON.parse(decodedData);
      console.log('Parsed campaigns:', parsedData);
      return parsedData;
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
        justify-content: center;
        gap: 15px;
      `;

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

      window.addEventListener('scroll', () => {
        const originalButton = document.querySelector('.btn.btn-add-to-cart');
        if (!originalButton) return;

        const buttonRect = originalButton.getBoundingClientRect();
        const isButtonVisible = buttonRect.top >= 0 && buttonRect.bottom <= window.innerHeight;
        container.style.display = !isButtonVisible ? 'block' : 'none';
      });
    },

    findActiveCampaignForProduct(productId) {
      console.log('Finding campaign for product:', productId);
      console.log('Available campaigns:', this.campaigns);
      
      const now = new Date();
      console.log('Current time:', now);
  
      const activeCampaign = this.campaigns.find(campaign => {
          console.log('\nChecking campaign:', campaign);
          
          // Check if campaign has products array
          if (!campaign.products || !Array.isArray(campaign.products)) {
              console.log('Campaign has no products array');
              return false;
          }
  
          // Check if product is in campaign
          const hasProduct = campaign.products.some(p => p.id === productId);
          console.log('Product in campaign:', hasProduct);
  
          // Convert Unix timestamps to dates
          let startDate, endDate;
          try {
              startDate = new Date(Number(campaign.startDate.seconds) * 1000);
              endDate = new Date(Number(campaign.endDate.seconds) * 1000);
              
              console.log('Campaign dates:', {
                  start: startDate.toLocaleString(),
                  end: endDate.toLocaleString(),
                  now: now.toLocaleString()
              });
          } catch (error) {
              console.error('Error converting dates:', error);
              return false;
          }
  
          // Check if dates are valid
          if (!startDate || !endDate || isNaN(startDate) || isNaN(endDate)) {
              console.log('Invalid dates');
              return false;
          }
  
          // Remove time from dates for comparison
          const startWithoutTime = new Date(startDate.setHours(0, 0, 0, 0));
          const endWithoutTime = new Date(endDate.setHours(23, 59, 59, 999));
          const nowWithoutTime = new Date(now.setHours(0, 0, 0, 0));
  
          const isInDateRange = (nowWithoutTime >= startWithoutTime && nowWithoutTime <= endWithoutTime);
          console.log('Date comparison:', {
              start: startWithoutTime.toLocaleString(),
              end: endWithoutTime.toLocaleString(),
              now: nowWithoutTime.toLocaleString(),
              isInRange: isInDateRange
          });
  
          const isActive = campaign.status === 'active';
          console.log('Campaign status:', isActive);
  
          const isValid = hasProduct && isInDateRange && isActive;
          console.log('Campaign valid:', isValid, {
              hasProduct,
              isInDateRange,
              isActive
          });
  
          return isValid;
      });
  
      console.log('Final campaign found:', activeCampaign);
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

      const endDate = campaign.endDate?.seconds ? 
        new Date(campaign.endDate.seconds * 1000) : 
        new Date(campaign.endDate);

      const updateTimer = () => {
        const now = new Date();
        const timeDiff = endDate - now;

        if (timeDiff <= 0) {
          container.remove();
          clearInterval(timerInterval);
          this.activeTimers.delete(productId);
          return;
        }

        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

        timeElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      };

      updateTimer();
      const timerInterval = setInterval(updateTimer, 1000);
      this.activeTimers.set(productId, timerInterval);

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
        console.log('Found product ID from wishlist button:', productId);
      }

      if (!productId) {
        const productForm = document.querySelector('form[data-product-id]');
        if (productForm) {
          productId = productForm.getAttribute('data-product-id');
          console.log('Found product ID from form:', productId);
        }
      }

      if (!productId) {
        console.log('No product ID found on page');
        return;
      }

      this.currentProductId = productId;

      const activeCampaign = this.findActiveCampaignForProduct(productId);
      console.log('Active campaign found:', activeCampaign);

      if (!activeCampaign) {
        console.log('No active campaign found for product:', productId);
        return;
      }

      console.log('Creating timer for campaign:', activeCampaign);
      const timer = this.createCountdownTimer(activeCampaign, productId);

      let inserted = false;

      const priceSelectors = [
        'h2.product-formatted-price.theme-text-primary',
        '.product-formatted-price',
        '.product-formatted-price.theme-text-primary',
        '.product-price',
        'h2.theme-text-primary',
        '.theme-text-primary'
      ];

      for (const selector of priceSelectors) {
        const priceContainer = document.querySelector(selector);
        console.log(`Trying selector "${selector}":`, !!priceContainer);
        
        if (priceContainer?.parentElement) {
          priceContainer.parentElement.insertBefore(timer, priceContainer);
          console.log('Timer inserted successfully at', selector);
          inserted = true;
          break;
        }
      }

      if (!inserted) {
        console.log('Could not find price container, trying alternative locations');
        const productDetails = document.querySelector('.products-details');
        if (productDetails) {
          productDetails.insertBefore(timer, productDetails.firstChild);
          console.log('Timer inserted in product details');
          inserted = true;
        }
      }

      if (!inserted) {
        console.log('Failed to insert timer');
      }
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
      }
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SmartCart.initialize());
  } else {
    SmartCart.initialize();
  }
})();
