// src/scripts/smartCart.js v1.2.3
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
      const activeCampaign = this.campaigns.find(campaign => {
          console.log('Checking campaign:', campaign);
  
          // Check if campaign has products array
          if (!campaign.products || !Array.isArray(campaign.products)) {
              console.log('Campaign has no products array:', campaign);
              return false;
          }
  
          // Check if product is in campaign
          const hasProduct = campaign.products.some(p => p.id === productId);
          console.log('Product in campaign:', hasProduct);
  
          // Convert timestamps to dates
          let startDate, endDate;
          try {
              // Handle both timestamp and seconds formats
              startDate = campaign.startDate?._seconds ? 
                  new Date(campaign.startDate._seconds * 1000) :
                  new Date(campaign.startDate.seconds * 1000);
                  
              endDate = campaign.endDate?._seconds ? 
                  new Date(campaign.endDate._seconds * 1000) :
                  new Date(campaign.endDate.seconds * 1000);
  
              console.log('Parsed dates:', {
                  startDate: startDate.toISOString(),
                  endDate: endDate.toISOString(),
                  now: now.toISOString()
              });
          } catch (error) {
              console.error('Error parsing dates:', error);
              return false;
          }
  
          // Check if dates are valid
          if (!(startDate instanceof Date && !isNaN(startDate)) || 
              !(endDate instanceof Date && !isNaN(endDate))) {
              console.log('Invalid dates');
              return false;
          }
  
          const isInDateRange = now >= startDate && now <= endDate;
          console.log('In date range:', isInDateRange);
  
          const isActive = campaign.status === 'active';
          console.log('Campaign active:', isActive);
  
          const isValidCampaign = hasProduct && isInDateRange && isActive;
          console.log('Campaign valid for product:', isValidCampaign);
  
          return isValidCampaign;
      });
  
      console.log('Found active campaign:', activeCampaign);
      return activeCampaign;
  },

  createCountdownTimer(campaign, productId) {
    // Previous cleanup code remains the same...

    const isArabic = getCurrentLanguage() === 'ar';
    const container = document.createElement('div');
    container.id = `hmstudio-countdown-${productId}`;
    container.style.cssText = `
        background: ${campaign.timerSettings.backgroundColor};
        color: ${campaign.timerSettings.textColor};
        padding: 12px 15px;
        margin: 15px 0;
        border-radius: 8px;
        text-align: center;
        direction: ${isArabic ? 'rtl' : 'ltr'};
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        font-size: 14px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        font-family: ${isArabic ? 'var(--font-arabic, system-ui)' : 'inherit'};
    `;

    const textElement = document.createElement('span');
    const timerText = isArabic ? campaign.timerSettings.textAr : campaign.timerSettings.textEn;
    textElement.textContent = timerText;
    textElement.style.fontWeight = '500';
    
    const timeElement = document.createElement('div');
    timeElement.style.cssText = `
        display: flex;
        align-items: center;
        gap: 4px;
        font-weight: bold;
        padding: 4px 8px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.15);
        direction: ${isArabic ? 'ltr' : 'ltr'}; /* Keep timer numbers LTR even in Arabic */
    `;

    // For Arabic, flip the order of elements
    if (isArabic) {
        container.appendChild(timeElement);
        container.appendChild(textElement);
    } else {
        container.appendChild(textElement);
        container.appendChild(timeElement);
    }

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

        // Calculate time units
        const months = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 30.44));
        const days = Math.floor((timeDiff % (1000 * 60 * 60 * 24 * 30.44)) / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

        // Clear timeElement
        timeElement.innerHTML = '';

        // Create array of time components
        const timeUnits = [];
        if (months > 0) timeUnits.push(`${months.toString().padStart(2, '0')}${isArabic ? 'ش' : 'M'}`);
        if (days > 0 || months > 0) timeUnits.push(`${days.toString().padStart(2, '0')}${isArabic ? 'ي' : 'D'}`);
        timeUnits.push(
            `${hours.toString().padStart(2, '0')}${isArabic ? 'س' : 'H'}`,
            `${minutes.toString().padStart(2, '0')}${isArabic ? 'د' : 'M'}`,
            `${seconds.toString().padStart(2, '0')}${isArabic ? 'ث' : 'S'}`
        );

        // Join with proper separator
        timeElement.textContent = timeUnits.join(' : ');
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
