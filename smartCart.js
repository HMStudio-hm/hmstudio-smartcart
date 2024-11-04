// HMStudio Smart Cart v1.0.0
// Created by HMStudio
// Features: Sticky Add to Cart & Offer Timer

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
      stickyCartElement: null,
      offerTimerElement: null,
      originalAddToCartBtn: null,
      productData: null,
  
      async fetchSettings() {
        try {
          const response = await fetch(`https://europe-west3-hmstudio-85f42.cloudfunctions.net/getSmartCartSettings?storeId=${storeId}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch settings: ${response.statusText}`);
          }
          const data = await response.json();
          console.log('Fetched Smart Cart settings:', data);
          return data;
        } catch (error) {
          console.error('Error fetching Smart Cart settings:', error);
          return null;
        }
      },
  
      createStickyCart() {
        const currentLang = getCurrentLanguage();
        const isRTL = currentLang === 'ar';
  
        // Remove existing sticky cart if any
        if (this.stickyCartElement) {
          this.stickyCartElement.remove();
        }
  
        const container = document.createElement('div');
        container.id = 'hmstudio-sticky-cart';
        container.style.cssText = `
          position: fixed;
          ${this.settings.stickyCart.position === 'bottom' ? 'left: 0; right: 0;' : 'right: 20px;'}
          bottom: 20px;
          background: white;
          box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
          padding: 15px;
          z-index: 999;
          display: none;
          border-radius: ${this.settings.stickyCart.position === 'bottom' ? '0' : '8px'};
          width: ${this.settings.stickyCart.position === 'bottom' ? '100%' : '300px'};
          direction: ${isRTL ? 'rtl' : 'ltr'};
        `;
  
        const innerContent = document.createElement('div');
        innerContent.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 1200px;
          margin: 0 auto;
          gap: 15px;
        `;
  
        // Product info section
        const productInfo = document.createElement('div');
        productInfo.style.cssText = `
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
        `;
  
        // Product image
        const productImage = document.createElement('img');
        productImage.src = document.querySelector('.product-details-page img')?.src || '';
        productImage.style.cssText = `
          width: 50px;
          height: 50px;
          object-fit: cover;
          border-radius: 4px;
        `;
        productInfo.appendChild(productImage);
  
        // Product title and price
        const productText = document.createElement('div');
        productText.style.cssText = `
          flex: 1;
          min-width: 0;
        `;
  
        const productTitle = document.createElement('div');
        productTitle.textContent = document.querySelector('.product-title')?.textContent || '';
        productTitle.style.cssText = `
          font-weight: bold;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        `;
        productText.appendChild(productTitle);
  
        const productPrice = document.createElement('div');
        productPrice.textContent = document.querySelector('.product-price')?.textContent || '';
        productPrice.style.cssText = `
          color: #4CAF50;
          font-weight: bold;
        `;
        productText.appendChild(productPrice);
  
        productInfo.appendChild(productText);
  
        // Quantity selector
        const quantityWrapper = document.createElement('div');
        quantityWrapper.style.cssText = `
          display: flex;
          align-items: center;
          border: 1px solid #ddd;
          border-radius: 4px;
          overflow: hidden;
        `;
  
        const decreaseBtn = document.createElement('button');
        decreaseBtn.textContent = '-';
        decreaseBtn.style.cssText = `
          width: 32px;
          height: 32px;
          border: none;
          background: #f5f5f5;
          cursor: pointer;
          font-size: 16px;
        `;
  
        const quantityInput = document.createElement('input');
        quantityInput.type = 'number';
        quantityInput.min = '1';
        quantityInput.value = '1';
        quantityInput.style.cssText = `
          width: 50px;
          height: 32px;
          border: none;
          border-left: 1px solid #ddd;
          border-right: 1px solid #ddd;
          text-align: center;
          -moz-appearance: textfield;
        `;
  
        const increaseBtn = document.createElement('button');
        increaseBtn.textContent = '+';
        increaseBtn.style.cssText = `
          width: 32px;
          height: 32px;
          border: none;
          background: #f5f5f5;
          cursor: pointer;
          font-size: 16px;
        `;
  
        // Event listeners for quantity controls
        decreaseBtn.addEventListener('click', () => {
          const currentValue = parseInt(quantityInput.value);
          if (currentValue > 1) {
            quantityInput.value = currentValue - 1;
            this.updateOriginalQuantity(currentValue - 1);
          }
        });
  
        increaseBtn.addEventListener('click', () => {
          const currentValue = parseInt(quantityInput.value);
          quantityInput.value = currentValue + 1;
          this.updateOriginalQuantity(currentValue + 1);
        });
  
        quantityInput.addEventListener('change', () => {
          if (quantityInput.value < 1) quantityInput.value = 1;
          this.updateOriginalQuantity(parseInt(quantityInput.value));
        });
  
        quantityWrapper.appendChild(decreaseBtn);
        quantityWrapper.appendChild(quantityInput);
        quantityWrapper.appendChild(increaseBtn);
  
        // Add to cart button
        const addToCartBtn = document.createElement('button');
        addToCartBtn.textContent = currentLang === 'ar' ? 'أضف إلى السلة' : 'Add to Cart';
        addToCartBtn.style.cssText = `
          background-color: #4CAF50;
          color: white;
          border: none;
          padding: 0 20px;
          height: 40px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          white-space: nowrap;
        `;
  
        addToCartBtn.addEventListener('click', () => {
          this.originalAddToCartBtn?.click();
        });
  
        // Assemble the sticky cart
        innerContent.appendChild(productInfo);
        innerContent.appendChild(quantityWrapper);
        innerContent.appendChild(addToCartBtn);
        container.appendChild(innerContent);
  
        document.body.appendChild(container);
        this.stickyCartElement = container;
  
        // Show/hide sticky cart based on scroll position
        window.addEventListener('scroll', () => {
          const originalButton = this.originalAddToCartBtn;
          if (!originalButton) return;
  
          const buttonRect = originalButton.getBoundingClientRect();
          const isButtonVisible = buttonRect.top >= 0 && buttonRect.bottom <= window.innerHeight;
  
          container.style.display = !isButtonVisible ? 'block' : 'none';
        });
      },
  
      createOfferTimer() {
        const currentLang = getCurrentLanguage();
        const isRTL = currentLang === 'ar';
  
        // Remove existing timer if any
        if (this.offerTimerElement) {
          this.offerTimerElement.remove();
        }
  
        const container = document.createElement('div');
        container.id = 'hmstudio-offer-timer';
        container.style.cssText = `
          background: #FFF3CD;
          color: #856404;
          padding: 10px;
          text-align: center;
          border-radius: 4px;
          margin-bottom: 15px;
          direction: ${isRTL ? 'rtl' : 'ltr'};
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        `;
  
        const timerText = document.createElement('span');
        timerText.textContent = this.settings.offerTimer.text[currentLang];
        container.appendChild(timerText);
  
        const timeDisplay = document.createElement('span');
        timeDisplay.style.fontWeight = 'bold';
        container.appendChild(timeDisplay);
  
        // Calculate end time
        const totalMinutes = (this.settings.offerTimer.hours * 60) + this.settings.offerTimer.minutes;
        const endTime = new Date(Date.now() + totalMinutes * 60000);
  
        // Update timer function
        const updateTimer = () => {
          const now = new Date();
          const timeDiff = endTime - now;
  
          if (timeDiff <= 0) {
            clearInterval(timerInterval);
            container.remove();
            return;
          }
  
          const hours = Math.floor(timeDiff / (1000 * 60 * 60));
          const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
  
          timeDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };
  
        // Initial update and start interval
        updateTimer();
        const timerInterval = setInterval(updateTimer, 1000);
  
        // Insert timer above price
        const priceElement = document.querySelector('.product-price');
        if (priceElement?.parentNode) {
          priceElement.parentNode.insertBefore(container, priceElement);
          this.offerTimerElement = container;
        }
      },
  
      updateOriginalQuantity(value) {
        const originalQuantityInput = document.querySelector('input[name="quantity"]');
        if (originalQuantityInput) {
          originalQuantityInput.value = value;
        }
      },
  
      initialize() {
        // Find the original add to cart button
        this.originalAddToCartBtn = document.querySelector('.add-to-cart-btn');
  
        // Initialize features when settings are loaded
        this.fetchSettings().then(settings => {
          if (settings && settings.enabled) {
            this.settings = settings;
            
            // Only initialize features on product pages
            if (document.querySelector('.product-details-page')) {
              if (this.settings.stickyCart.enabled) {
                this.createStickyCart();
              }
              if (this.settings.offerTimer.enabled) {
                this.createOfferTimer();
              }
            }
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
