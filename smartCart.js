// src/scripts/smartCart.js v1.4.0
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
        console.log('Raw decoded data:', decodedData);
        const parsedData = JSON.parse(decodedData);
        console.log('Initial parsed data:', parsedData);
        
        // Ensure the timer settings are properly structured
        const processedCampaigns = parsedData.map(campaign => {
            console.log('Processing campaign raw data:', campaign);
            console.log('Raw timer settings:', campaign.timerSettings);
            
            // Extract duration values directly
            const duration = campaign.timerSettings?.duration || {};
            console.log('Raw duration:', duration);
            
            return {
                ...campaign,
                timerSettings: {
                    textAr: decodeURIComponent(campaign.timerSettings?.textAr || ''),
                    textEn: decodeURIComponent(campaign.timerSettings?.textEn || ''),
                    duration: {
                        days: Number(duration.days || 0),
                        hours: Number(duration.hours || 0),
                        minutes: Number(duration.minutes || 0),
                        seconds: Number(duration.seconds || 0)
                    },
                    backgroundColor: campaign.timerSettings?.backgroundColor || '#000000',
                    textColor: campaign.timerSettings?.textColor || '#ffffff'
                }
            };
        });

        console.log('Final processed campaigns:', processedCampaigns);
        console.log('Final duration values:', processedCampaigns.map(c => c.timerSettings.duration));
        return processedCampaigns;
    } catch (error) {
        console.error('Error parsing campaigns data:', error);
        console.error('Error details:', error.message);
        console.error('Campaign string:', campaignsData);
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
      // ... existing createStickyCart code remains the same ...
    },

    findActiveCampaignForProduct(productId) {
      console.log('Finding campaign for product:', productId);
      console.log('Available campaigns:', this.campaigns);
      
      const activeCampaign = this.campaigns.find(campaign => {
        console.log('Checking campaign:', campaign);

        if (!campaign.products || !Array.isArray(campaign.products)) {
          console.log('Campaign has no products array:', campaign);
          return false;
        }

        const hasProduct = campaign.products.some(p => p.id === productId);
        console.log('Product in campaign:', hasProduct);

        const isActive = campaign.status === 'active';
        console.log('Campaign active:', isActive);

        return hasProduct && isActive;
      });

      console.log('Found active campaign:', activeCampaign);
      return activeCampaign;
    },

    createCountdownTimer(campaign, productId) {
      console.log('Creating countdown timer for campaign:', campaign);
      console.log('Timer settings:', campaign.timerSettings);
      console.log('Duration settings:', campaign.timerSettings.duration);

      // Remove existing timer if any
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
        min-height: 50px;
        width: 100%;
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
        justify-content: center;
        gap: 4px;
        font-weight: bold;
        padding: 4px 12px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.15);
        min-width: 200px;
      `;

      container.appendChild(textElement);
      container.appendChild(timeElement);

      // Calculate total duration in milliseconds
      const totalDuration = (
        (campaign.timerSettings.duration.days * 24 * 60 * 60 * 1000) +
        (campaign.timerSettings.duration.hours * 60 * 60 * 1000) +
        (campaign.timerSettings.duration.minutes * 60 * 1000) +
        (campaign.timerSettings.duration.seconds * 1000)
      );

      const startTime = Date.now();
      const endTime = startTime + totalDuration;

      let timerInterval;

      const updateTimer = () => {
        const now = Date.now();
        const timeDiff = endTime - now;

        if (timeDiff <= 0) {
          container.remove();
          clearInterval(timerInterval);
          this.activeTimers.delete(productId);
          return;
        }

        // Calculate remaining time
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

        // Create time units array
        let timeUnits = [];

        // Always show these units regardless of original settings
        timeUnits = [
          {
            value: days,
            label: getCurrentLanguage() === 'ar' ? 'يوم' : 'D'
          },
          {
            value: hours,
            label: getCurrentLanguage() === 'ar' ? 'س' : 'H'
          },
          {
            value: minutes,
            label: getCurrentLanguage() === 'ar' ? 'د' : 'M'
          },
          {
            value: seconds,
            label: getCurrentLanguage() === 'ar' ? 'ث' : 'S'
          }
        ];
        // Clear existing content
        timeElement.innerHTML = '';

        // Create elements for each time unit
        timeUnits.forEach((unit, index) => {
          const unitContainer = document.createElement('div');
          unitContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 2px;
          `;

          // Value (numbers)
          const valueSpan = document.createElement('span');
          valueSpan.textContent = String(unit.value).padStart(2, '0');
          valueSpan.style.cssText = `
            display: inline-block;
            min-width: 25px;
            text-align: center;
            font-size: 16px;
            font-weight: bold;
          `;
          console.log(`Setting value for ${unit.label}:`, unit.value);

          // Label (D, H, M, S)
          const labelSpan = document.createElement('span');
          labelSpan.textContent = unit.label;
          labelSpan.style.cssText = `
            font-size: 12px;
            opacity: 0.8;
          `;

          unitContainer.appendChild(valueSpan);
          unitContainer.appendChild(labelSpan);
          timeElement.appendChild(unitContainer);

          // Add separator if not last unit
          if (index < timeUnits.length - 1) {
            const separator = document.createElement('span');
            separator.textContent = ':';
            separator.style.cssText = `
              margin: 0 2px;
              opacity: 0.8;
            `;
            timeElement.appendChild(separator);
          }
        });
      };

      // Initial update and start interval
      updateTimer();
      timerInterval = setInterval(updateTimer, 1000);
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
