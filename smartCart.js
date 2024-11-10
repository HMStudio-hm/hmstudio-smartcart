// src/scripts/smartCart.js v1.1.3
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
    if (!campaignsData) return [];

    try {
      const decodedData = atob(campaignsData);
      return JSON.parse(decodedData);
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

    findActiveCampaignForProduct(productId) {
      const now = new Date();
      return this.campaigns.find(campaign => {
        const startDate = new Date(campaign.startDate.seconds * 1000);
        const endDate = new Date(campaign.endDate.seconds * 1000);
        const isActive = campaign.status === 'active' && 
                        now >= startDate && 
                        now <= endDate;
        const includesProduct = campaign.products.some(p => p.id === productId);
        return isActive && includesProduct;
      });
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
          this.activeTimers.delete(productId);
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
      this.activeTimers.set(productId, timerInterval);

      return container;
    },

    setupProductTimer() {
      // Clear any existing timer
      if (this.activeTimers.size > 0) {
        this.activeTimers.forEach((interval, productId) => {
          clearInterval(interval);
          const timer = document.getElementById(`hmstudio-countdown-${productId}`);
          if (timer) timer.remove();
        });
        this.activeTimers.clear();
      }
    
      // Get current product ID - try multiple selectors
      let productId;
      const productForm = document.querySelector('form[data-product-id]');
      if (productForm) {
        productId = productForm.getAttribute('data-product-id');
      } else {
        // Try alternative selectors
        const wishlistBtn = document.querySelector('[data-wishlist-id]');
        if (wishlistBtn) {
          productId = wishlistBtn.getAttribute('data-wishlist-id');
        }
      }
    
      if (!productId) {
        console.log('Product ID not found');
        return;
      }
    
      this.currentProductId = productId;
    
      // Find active campaign for this product
      const activeCampaign = this.findActiveCampaignForProduct(this.currentProductId);
      if (!activeCampaign) {
        console.log('No active campaign found for product:', this.currentProductId);
        return;
      }
    
      // Create timer
      const timer = this.createCountdownTimer(activeCampaign, this.currentProductId);
    
      // Try multiple insertion points based on the actual HTML structure
      let inserted = false;
      
      // First try: Above product-formatted-price
      const priceHeading = document.querySelector('.product-formatted-price.theme-text-primary');
      if (priceHeading?.parentElement) {
        priceHeading.parentElement.insertBefore(timer, priceHeading);
        inserted = true;
        console.log('Timer inserted above price heading');
      }
    
      // Second try: Inside col-product-info
      if (!inserted) {
        const productInfoCol = document.querySelector('.col-product-info');
        if (productInfoCol) {
          const firstChild = productInfoCol.firstChild;
          productInfoCol.insertBefore(timer, firstChild);
          inserted = true;
          console.log('Timer inserted in product info column');
        }
      }
    
      // Third try: Inside products-details section
      if (!inserted) {
        const productsDetails = document.querySelector('.products-details');
        if (productsDetails) {
          const targetSection = productsDetails.querySelector('section');
          if (targetSection) {
            targetSection.insertBefore(timer, targetSection.firstChild);
            inserted = true;
            console.log('Timer inserted in products details section');
          }
        }
      }
    
      // Fourth try: Inside col-lg-6 col-product-info
      if (!inserted) {
        const productInfoDiv = document.querySelector('.col-lg-6.col-product-info');
        if (productInfoDiv) {
          const firstElement = productInfoDiv.firstElementChild;
          productInfoDiv.insertBefore(timer, firstElement);
          inserted = true;
          console.log('Timer inserted in product info div');
        }
      }
    
      // Fifth try: Before the h1 title
      if (!inserted) {
        const titleElement = document.querySelector('h1');
        if (titleElement?.parentElement) {
          titleElement.parentElement.insertBefore(timer, titleElement);
          inserted = true;
          console.log('Timer inserted before title');
        }
      }
    
      if (!inserted) {
        console.log('Could not find suitable location for timer');
      }
    },

    setupProductListTimers() {
      // Clear existing timers
      this.activeTimers.forEach((interval, productId) => {
        clearInterval(interval);
        const timer = document.getElementById(`hmstudio-countdown-${productId}`);
        if (timer) timer.remove();
      });
      this.activeTimers.clear();

      // Find all product cards
      const productCards = document.querySelectorAll('.product-item.position-relative');
      console.log('Found product cards:', productCards.length);

      productCards.forEach(card => {
        const productId = card.querySelector('[data-wishlist-id]')?.getAttribute('data-wishlist-id');
        if (!productId) {
          console.log('No product ID found for card');
          return;
        }

        const activeCampaign = this.findActiveCampaignForProduct(productId);
        if (!activeCampaign) {
          console.log('No active campaign for product:', productId);
          return;
        }

        const timer = this.createCountdownTimer(activeCampaign, productId);
        
        // Try to insert timer in card
        let inserted = false;

        // First try: Above price
        const priceElement = card.querySelector('.product-formatted-price');
        if (priceElement?.parentElement) {
          priceElement.parentElement.insertBefore(timer, priceElement);
          inserted = true;
          console.log('Timer inserted above price in card');
        }

        // Second try: Product info area
        if (!inserted) {
          const productInfo = card.querySelector('.product-info') || 
                            card.querySelector('.product-content');
          if (productInfo) {
            productInfo.insertBefore(timer, productInfo.firstChild);
            inserted = true;
            console.log('Timer inserted in product info area');
          }
        }

        if (!inserted) {
          console.log('Could not find location for timer in product card');
        }
      });
    },

    initialize() {
      console.log('Initializing Smart Cart with campaigns:', this.campaigns);

      const isProductPage = document.querySelector('.product.products-details-page') ||
                           document.querySelector('.products-details-page') ||
                           document.querySelector('[data-product-id]');

      if (isProductPage) {
        console.log('On product page, setting up product timer');
        this.setupProductTimer();
        this.createStickyCart();

        // Enhanced mutation observer
        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            if (!document.getElementById(`hmstudio-countdown-${this.currentProductId}`)) {
              console.log('Timer not found, re-adding...');
              this.setupProductTimer();
              break;
            }
          }
        });

        observer.observe(document.body, { 
          childList: true, 
          subtree: true,
          attributes: true 
        });
      } else {
        console.log('On product list page, setting up product list timers');
        this.setupProductListTimers();

        // Set up observer for product list changes
        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            if (mutation.type === 'childList') {
              this.setupProductListTimers();
              break;
            }
          }
        });

        const productsContainer = document.querySelector('.products-grid') || 
                                document.querySelector('.products-list') ||
                                document.querySelector('.products-container');
        
        if (productsContainer) {
          observer.observe(productsContainer, { 
            childList: true, 
            subtree: true 
          });
        }
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
