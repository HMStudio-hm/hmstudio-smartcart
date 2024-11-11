// src/scripts/smartCart.js v1.2.7
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
      // Decode any encoded text fields
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
      quantityInput.value = '1';
      quantityInput.style.cssText = `
        width: 40px;
        text-align: center;
        border: none;
        background: transparent;
        font-size: 14px;
        -moz-appearance: textfield;
      `;
      quantityInput.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        if (isNaN(value) || value < 1) {
          e.target.value = '1';
        }
        // Update original quantity input if it exists
        const originalQuantity = document.querySelector('input[name="quantity"]');
        if (originalQuantity) {
          originalQuantity.value = e.target.value;
        }
      });

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

      // Add event listeners for quantity buttons
      decreaseBtn.addEventListener('click', () => {
        const currentValue = parseInt(quantityInput.value);
        if (currentValue > 1) {
          quantityInput.value = currentValue - 1;
          // Update original quantity input
          const originalQuantity = document.querySelector('input[name="quantity"]');
          if (originalQuantity) {
            originalQuantity.value = quantityInput.value;
          }
        }
      });

      increaseBtn.addEventListener('click', () => {
        const currentValue = parseInt(quantityInput.value);
        quantityInput.value = currentValue + 1;
        // Update original quantity input
        const originalQuantity = document.querySelector('input[name="quantity"]');
        if (originalQuantity) {
          originalQuantity.value = quantityInput.value;
        }
      });

      // Assemble quantity selector
      quantityWrapper.appendChild(decreaseBtn);
      quantityWrapper.appendChild(quantityInput);
      quantityWrapper.appendChild(increaseBtn);

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
        flex-shrink: 0;
      `;

      addButton.addEventListener('mouseover', () => addButton.style.opacity = '0.9');
      addButton.addEventListener('mouseout', () => addButton.style.opacity = '1');
      addButton.addEventListener('click', () => {
        // Update original quantity input before clicking add to cart
        const originalQuantity = document.querySelector('input[name="quantity"]');
        if (originalQuantity) {
          originalQuantity.value = quantityInput.value;
        }
        const originalButton = document.querySelector('.btn.btn-add-to-cart');
        if (originalButton) {
          originalButton.click();
        }
      });

      wrapper.appendChild(quantityWrapper);
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

        // Sync quantity with original input when sticky cart becomes visible
        if (!isButtonVisible) {
          const originalQuantity = document.querySelector('input[name="quantity"]');
          if (originalQuantity) {
            quantityInput.value = originalQuantity.value;
          }
        }
      });
    },

    findActiveCampaignForProduct(productId) {
      console.log('Finding campaign for product:', productId);
      const now = new Date();
      return this.campaigns.find(campaign => {
        if (!campaign.products || !Array.isArray(campaign.products)) {
          return false;
        }

        const hasProduct = campaign.products.some(p => p.id === productId);
        
        // Convert timestamps to dates
        const startDate = campaign.startDate?.seconds ? 
          new Date(campaign.startDate.seconds * 1000) : 
          new Date(campaign.startDate);
        
        const endDate = campaign.endDate?.seconds ? 
          new Date(campaign.endDate.seconds * 1000) : 
          new Date(campaign.endDate);

        const isInDateRange = now >= startDate && now <= endDate;
        const isActive = campaign.status === 'active';

        return hasProduct && isInDateRange && isActive;
      });
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
        gap: 4px;
        font-weight: bold;
        padding: 4px 8px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.15);
        direction: ltr;
      `;

      if (getCurrentLanguage() === 'ar') {
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

        const months = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 30.44));
        const days = Math.floor((timeDiff % (1000 * 60 * 60 * 24 * 30.44)) / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

        const timeUnits = [];
        if (months > 0) timeUnits.push(`${months.toString().padStart(2, '0')}${getCurrentLanguage() === 'ar' ? 'ش' : 'M'}`);
        if (days > 0 || months > 0) timeUnits.push(`${days.toString().padStart(2, '0')}${getCurrentLanguage() === 'ar' ? 'ي' : 'D'}`);
        timeUnits.push(
          `${hours.toString().padStart(2, '0')}${getCurrentLanguage() === 'ar' ? 'س' : 'H'}`,
          `${minutes.toString().padStart(2, '0')}${getCurrentLanguage() === 'ar' ? 'د' : 'M'}`,
          `${seconds.toString().padStart(2, '0')}${getCurrentLanguage() === 'ar' ? 'ث' : 'S'}`
        );

        timeElement.textContent = timeUnits.join(' : ');
      };

      updateTimer();
      const timerInterval = setInterval(updateTimer, 1000);
      this.activeTimers.set(productId, timerInterval);

      return container;
    },

    setupProductTimer() {
      if (this.activeTimers.size > 0) {
        this.activeTimers.forEach((interval, productId) => {
          clearInterval(interval);
          const timer = document.getElementById(`hmstudio-countdown-${productId}`);
          if (timer) timer.remove();
        });
        this.activeTimers.clear();
      }

      // Get current product ID
      const productForm = document.querySelector('form[data-product-id]');
      if (!productForm) {
        console.log('Product form not found');
        return;
      }
      
      this.currentProductId = productForm.getAttribute('data-product-id');
      
      // Find active campaign for this product
      const activeCampaign = this.findActiveCampaignForProduct(this.currentProductId);
      if (!activeCampaign) {
        console.log('No active campaign found for product:', this.currentProductId);
        return;
      }

      // Create timer
      const timer = this.createCountdownTimer(activeCampaign, this.currentProductId);

      // Insert timer at the specific location
      const priceContainer = document.querySelector('h2.product-formatted-price.theme-text-primary');
      if (priceContainer?.parentElement) {
        priceContainer.parentElement.insertBefore(timer, priceContainer);
        console.log('Timer inserted successfully');

        // Create sticky cart after timer
        this.createStickyCart();

        // Set up observer for dynamic content changes
        const observer = new MutationObserver(() => {
          // Check if timer exists
          if (!document.getElementById(`hmstudio-countdown-${this.currentProductId}`)) {
            this.setupProductTimer();
          }

          // Check if sticky cart exists
          if (!document.getElementById('hmstudio-sticky-cart')) {
            this.createStickyCart();
          }

          // Sync quantity inputs if they exist
          const originalQuantity = document.querySelector('input[name="quantity"]');
          const stickyQuantity = document.querySelector('#hmstudio-sticky-cart input[type="number"]');
          if (originalQuantity && stickyQuantity && originalQuantity.value !== stickyQuantity.value) {
            stickyQuantity.value = originalQuantity.value;
          }
        });

        observer.observe(document.body, { 
          childList: true, 
          subtree: true,
          attributes: true 
        });
      } else {
        console.log('Price container not found for timer insertion');
      }
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SmartCart.initialize());
  } else {
    SmartCart.initialize();
  }
})();
