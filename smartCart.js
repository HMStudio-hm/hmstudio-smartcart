// src/scripts/smartCart.js v1.2.9
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
        
        // Decode the Arabic and English text
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
    
      // Function to get and update quantity
      const getOriginalQuantitySelect = () => document.querySelector('select#product-quantity');
      const updateQuantity = (value) => {
        // Update sticky cart quantity input
        quantityInput.value = value;
    
        // Find and update original quantity select
        const originalSelect = getOriginalQuantitySelect();
        if (originalSelect) {
          originalSelect.value = value;
          // Trigger change event
          const event = new Event('change', { bubbles: true });
          originalSelect.dispatchEvent(event);
        }
      };
    
      // Create quantity selector
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
      quantityInput.max = '10'; // Match the select options
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
    
      // Add event listeners
      decreaseBtn.addEventListener('click', () => {
        const currentValue = parseInt(quantityInput.value);
        if (currentValue > 1) {
          updateQuantity(currentValue - 1);
        }
      });
    
      increaseBtn.addEventListener('click', () => {
        const currentValue = parseInt(quantityInput.value);
        if (currentValue < 10) { // Match max quantity in select
          updateQuantity(currentValue + 1);
        }
      });
    
      quantityInput.addEventListener('change', (e) => {
        let value = parseInt(e.target.value);
        if (isNaN(value) || value < 1) {
          value = 1;
        } else if (value > 10) {
          value = 10;
        }
        updateQuantity(value);
      });
    
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
        flex-grow: 1;
      `;
    
      addButton.addEventListener('mouseover', () => addButton.style.opacity = '0.9');
      addButton.addEventListener('mouseout', () => addButton.style.opacity = '1');
      addButton.addEventListener('click', () => {
        // Update quantity before clicking
        const originalSelect = getOriginalQuantitySelect();
        if (originalSelect) {
          originalSelect.value = quantityInput.value;
          // Trigger change event
          const event = new Event('change', { bubbles: true });
          originalSelect.dispatchEvent(event);
        }
    
        // Find and click original button
        const originalButton = document.querySelector('.btn.btn-add-to-cart');
        if (originalButton) {
          // Add a small delay to ensure the quantity update is processed
          setTimeout(() => {
            originalButton.click();
          }, 100);
        }
      });
    
      // Assemble quantity selector and add to container
      quantityWrapper.appendChild(decreaseBtn);
      quantityWrapper.appendChild(quantityInput);
      quantityWrapper.appendChild(increaseBtn);
    
      wrapper.appendChild(quantityWrapper);
      wrapper.appendChild(addButton);
      container.appendChild(wrapper);
      document.body.appendChild(container);
    
      this.stickyCartElement = container;
    
      // Show/hide on scroll and sync quantity
      window.addEventListener('scroll', () => {
        const originalButton = document.querySelector('.btn.btn-add-to-cart');
        const originalSelect = getOriginalQuantitySelect();
        
        if (!originalButton) return;
    
        const buttonRect = originalButton.getBoundingClientRect();
        const isButtonVisible = buttonRect.top >= 0 && buttonRect.bottom <= window.innerHeight;
        
        if (!isButtonVisible) {
          container.style.display = 'block';
          // Sync quantity when sticky cart becomes visible
          if (originalSelect) {
            quantityInput.value = originalSelect.value;
          }
        } else {
          container.style.display = 'none';
        }
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
  `;

  const textElement = document.createElement('span');
  // Use the appropriate text based on language
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

    // Convert endDate timestamp to Date object
    let endDate;
    try {
        endDate = campaign.endDate?._seconds ? 
            new Date(campaign.endDate._seconds * 1000) :
            new Date(campaign.endDate.seconds * 1000);
    } catch (error) {
        console.error('Error parsing end date:', error);
        return container;
    }

    const updateTimer = () => {
        const now = new Date();
        const timeDiff = endDate - now;

        if (timeDiff <= 0) {
            container.remove();
            clearInterval(timerInterval);
            this.activeTimers.delete(productId);
            return;
        }

        // Calculate time components
        const months = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 30.44)); // Approximate months
        const days = Math.floor((timeDiff % (1000 * 60 * 60 * 24 * 30.44)) / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

        // Create time units array
        let timeUnits = [];

        // Add months if applicable
        if (months > 0) {
            timeUnits.push({
                value: months,
                label: getCurrentLanguage() === 'ar' ? 'شهر' : 'M'
            });
        }

        // Add days if applicable
        if (days > 0 || months > 0) {
            timeUnits.push({
                value: days,
                label: getCurrentLanguage() === 'ar' ? 'يوم' : 'D'
            });
        }

        // Always add hours, minutes, and seconds
        timeUnits.push(
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
        );

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

            const valueSpan = document.createElement('span');
            valueSpan.textContent = String(unit.value).padStart(2, '0');
            valueSpan.style.minWidth = '20px';

            const labelSpan = document.createElement('span');
            labelSpan.textContent = unit.label;
            labelSpan.style.fontSize = '12px';
            labelSpan.style.opacity = '0.8';

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

    // Initial update and start interval
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
