// HMStudio Smart Cart v1.0.2
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
          box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
          padding: 15px;
          z-index: 999;
          display: none;
          direction: ${getCurrentLanguage() === 'ar' ? 'rtl' : 'ltr'};
        `;
  
        const innerContent = document.createElement('div');
        innerContent.style.cssText = `
          display: flex;
          align-items: center;
          gap: 15px;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        `;
  
        // Product image and title
        const productInfo = document.createElement('div');
        productInfo.style.cssText = `
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
        `;
  
        const productImage = document.createElement('img');
        productImage.src = document.querySelector('.product-images img')?.src || '';
        productImage.style.cssText = `
          width: 50px;
          height: 50px;
          object-fit: cover;
          border-radius: 4px;
        `;
  
        const productTitle = document.createElement('div');
        productTitle.textContent = document.querySelector('.product-title')?.textContent || '';
        productTitle.style.cssText = `
          font-weight: 500;
          flex: 1;
        `;
  
        productInfo.appendChild(productImage);
        productInfo.appendChild(productTitle);
  
        // Price
        const priceElement = document.createElement('div');
        const originalPrice = document.querySelector('.product-formatted-price.theme-text-primary');
        priceElement.textContent = originalPrice ? originalPrice.textContent : '';
        priceElement.style.cssText = `
          font-weight: bold;
          color: var(--theme-text-primary);
        `;
  
        // Quantity controls
        const quantityWrapper = document.createElement('div');
        quantityWrapper.style.cssText = `
          display: flex;
          align-items: center;
          border: 1px solid #ddd;
          border-radius: 4px;
        `;
  
        const createButton = (text) => {
          const btn = document.createElement('button');
          btn.textContent = text;
          btn.style.cssText = `
            width: 36px;
            height: 36px;
            border: none;
            background: #f5f5f5;
            cursor: pointer;
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
          `;
          return btn;
        };
  
        const decreaseBtn = createButton('-');
        const increaseBtn = createButton('+');
        
        const quantityInput = document.createElement('input');
        quantityInput.type = 'number';
        quantityInput.value = '1';
        quantityInput.min = '1';
        quantityInput.style.cssText = `
          width: 50px;
          height: 36px;
          border: none;
          border-left: 1px solid #ddd;
          border-right: 1px solid #ddd;
          text-align: center;
          -moz-appearance: textfield;
        `;
  
        // Add to cart button
        const addToCartBtn = document.createElement('button');
        addToCartBtn.textContent = getCurrentLanguage() === 'ar' ? 'أضف للسلة' : 'Add to Cart';
        addToCartBtn.style.cssText = `
          background-color: var(--theme-primary);
          color: white;
          border: none;
          padding: 0 30px;
          height: 36px;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
        `;
  
        // Events
        decreaseBtn.addEventListener('click', () => {
          const val = parseInt(quantityInput.value);
          if (val > 1) {
            quantityInput.value = val - 1;
            this.updateOriginalQuantity(quantityInput.value);
          }
        });
  
        increaseBtn.addEventListener('click', () => {
          quantityInput.value = parseInt(quantityInput.value) + 1;
          this.updateOriginalQuantity(quantityInput.value);
        });
  
        quantityInput.addEventListener('change', () => {
          if (quantityInput.value < 1) quantityInput.value = 1;
          this.updateOriginalQuantity(quantityInput.value);
        });
  
        addToCartBtn.addEventListener('click', () => {
          this.originalAddToCartBtn?.click();
        });
  
        // Assemble
        quantityWrapper.appendChild(decreaseBtn);
        quantityWrapper.appendChild(quantityInput);
        quantityWrapper.appendChild(increaseBtn);
  
        innerContent.appendChild(productInfo);
        innerContent.appendChild(priceElement);
        innerContent.appendChild(quantityWrapper);
        innerContent.appendChild(addToCartBtn);
  
        container.appendChild(innerContent);
        document.body.appendChild(container);
        this.stickyCartElement = container;
  
        // Show/hide on scroll
        window.addEventListener('scroll', () => {
          const originalButton = this.originalAddToCartBtn;
          if (!originalButton) return;
  
          const buttonRect = originalButton.getBoundingClientRect();
          const isButtonVisible = buttonRect.top >= 0 && buttonRect.bottom <= window.innerHeight;
          container.style.display = !isButtonVisible ? 'block' : 'none';
        });
      },
  
      createOfferTimer() {
        if (this.offerTimerElement) {
          this.offerTimerElement.remove();
        }
  
        const container = document.createElement('div');
        container.id = 'hmstudio-offer-timer';
        container.style.cssText = `
          background: ${this.settings.offerTimer.backgroundColor || '#FFF3CD'};
          color: ${this.settings.offerTimer.textColor || '#856404'};
          padding: 12px;
          text-align: center;
          border-radius: 4px;
          margin-bottom: 15px;
          direction: ${getCurrentLanguage() === 'ar' ? 'rtl' : 'ltr'};
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        `;
  
        const timerText = document.createElement('span');
        timerText.textContent = this.settings.offerTimer.text;
        
        const timeDisplay = document.createElement('span');
        timeDisplay.style.fontWeight = 'bold';
        
        container.appendChild(timerText);
        container.appendChild(timeDisplay);
  
        // Calculate end time
        const endDateTime = new Date(this.settings.offerTimer.endDate + 'T' + this.settings.offerTimer.endTime);
        
        if (endDateTime <= new Date()) {
          console.log('Offer has expired');
          return;
        }
  
        // Update timer function
        const updateTimer = () => {
          const now = new Date();
          const timeDiff = endDateTime - now;
  
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
  
        // Find the price element and insert the timer before it
        const priceElement = document.querySelector('.product-formatted-price.theme-text-primary');
        if (priceElement?.parentNode) {
          priceElement.parentNode.insertBefore(container, priceElement);
          this.offerTimerElement = container;
        } else {
          console.error('Price element not found');
        }
      },
  
      updateOriginalQuantity(value) {
        const originalQuantityInput = document.querySelector('input[name="quantity"]');
        if (originalQuantityInput) {
          originalQuantityInput.value = value;
          // Trigger change event
          const event = new Event('change', { bubbles: true });
          originalQuantityInput.dispatchEvent(event);
        }
      },
  
      initialize() {
        console.log('Initializing Smart Cart features');
        if (!document.querySelector('.product-details-page')) {
          console.log('Not a product page, skipping initialization');
          return;
        }
  
        this.originalAddToCartBtn = document.querySelector('.btn-add-to-cart');
        console.log('Original add to cart button found:', !!this.originalAddToCartBtn);
        
        this.fetchSettings().then(settings => {
          if (settings?.enabled) {
            console.log('Smart Cart is enabled, initializing features');
            this.settings = settings;
            this.createStickyCart();
            this.createOfferTimer();
          } else {
            console.log('Smart Cart is disabled');
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
