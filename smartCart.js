// scripts/smartCart.js
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
    stickyCartElement: null,
    offerTimerElement: null,
    originalAddToCartBtn: null,

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

      const quantityWrapper = document.createElement('div');
      quantityWrapper.style.cssText = `
        display: flex;
        align-items: center;
        border: 1px solid #ddd;
        border-radius: 4px;
        overflow: hidden;
      `;

      const createButton = (text, onClick) => {
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
          transition: background-color 0.3s;
        `;
        btn.addEventListener('mouseover', () => btn.style.backgroundColor = '#e0e0e0');
        btn.addEventListener('mouseout', () => btn.style.backgroundColor = '#f5f5f5');
        btn.addEventListener('click', onClick);
        return btn;
      };

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

      quantityInput.addEventListener('change', () => {
        if (quantityInput.value < 1) quantityInput.value = 1;
        this.updateOriginalQuantity(quantityInput.value);
      });

      const decreaseBtn = createButton('-', () => {
        const val = parseInt(quantityInput.value);
        if (val > 1) {
          quantityInput.value = val - 1;
          this.updateOriginalQuantity(val - 1);
        }
      });

      const increaseBtn = createButton('+', () => {
        const val = parseInt(quantityInput.value);
        quantityInput.value = val + 1;
        this.updateOriginalQuantity(val + 1);
      });

      quantityWrapper.appendChild(decreaseBtn);
      quantityWrapper.appendChild(quantityInput);
      quantityWrapper.appendChild(increaseBtn);

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
        this.updateOriginalQuantity(quantityInput.value);
        this.originalAddToCartBtn?.click();
      });

      const controlsSection = document.createElement('div');
      controlsSection.style.cssText = `
        display: flex;
        align-items: center;
        gap: 15px;
      `;

      controlsSection.appendChild(quantityWrapper);
      controlsSection.appendChild(addButton);

      wrapper.appendChild(controlsSection);
      container.appendChild(wrapper);
      document.body.appendChild(container);

      this.stickyCartElement = container;

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

      const settings = this.settings.offerTimer;
      if (!settings || !settings.enabled) {
        console.log('Timer is disabled or settings missing');
        return;
      }

      console.log('Creating timer with settings:', settings);

      const durationMilliseconds = (settings.hours * 60 + settings.minutes) * 60 * 1000;
      let endTime = new Date(Date.now() + durationMilliseconds);

      const container = document.createElement('div');
      container.id = 'hmstudio-offer-timer';
      container.style.cssText = `
        background: ${settings.backgroundColor || '#000000'};
        color: ${settings.textColor || '#ffffff'};
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
      textElement.textContent = settings.text;
      
      const timeElement = document.createElement('span');
      timeElement.style.cssText = `
        font-weight: bold;
        padding: 2px 6px;
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.1);
      `;

      container.appendChild(textElement);
      container.appendChild(timeElement);

      const updateTimer = () => {
        const now = new Date();
        const timeDiff = endTime - now;

        if (timeDiff <= 0) {
          endTime = new Date(Date.now() + durationMilliseconds);
          console.log('Timer restarted');
        }

        const currentDiff = endTime - new Date();
        const hours = Math.floor(currentDiff / (1000 * 60 * 60));
        const minutes = Math.floor((currentDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((currentDiff % (1000 * 60)) / 1000);

        timeElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      };

      updateTimer();
      const timerInterval = setInterval(updateTimer, 1000);

      const priceContainer = document.querySelector('.product-formatted-price.theme-text-primary')?.parentElement;
      if (priceContainer) {
        priceContainer.parentElement.insertBefore(container, priceContainer);
        this.offerTimerElement = container;
      } else {
        console.error('Price container not found');
      }

      const observer = new MutationObserver((mutations, obs) => {
        if (!document.body.contains(container)) {
          clearInterval(timerInterval);
          obs.disconnect();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    },

    updateOriginalQuantity(value) {
      const quantitySelect = document.querySelector('select[name="quantity"]');
      if (quantitySelect) {
        quantitySelect.value = value;
        const event = new Event('change', { bubbles: true });
        quantitySelect.dispatchEvent(event);
      }
    },

    initialize() {
      console.log('Initializing Smart Cart features');
      
      if (!document.querySelector('.product.products-details-page')) {
        console.log('Not a product page, skipping initialization');
        return;
      }

      this.originalAddToCartBtn = document.querySelector('.btn.btn-add-to-cart');
      console.log('Original add to cart button found:', !!this.originalAddToCartBtn);

      this.fetchSettings().then(settings => {
        if (settings?.enabled) {
          console.log('Smart Cart is enabled, initializing features with settings:', settings);
          this.settings = settings;
          
          if (settings.offerTimer) {
            console.log('Initializing offer timer');
            this.createOfferTimer();
          }
          
          console.log('Initializing sticky cart');
          this.createStickyCart();
        } else {
          console.log('Smart Cart is disabled');
        }
      });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SmartCart.initialize());
  } else {
    SmartCart.initialize();
  }
})();
