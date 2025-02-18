// src/scripts/smartCart.js v2.0.8
// HMStudio Smart Cart with Campaign Support

(() => {
  window.addEventListener('error', (event) => {
    console.error('Caught error:', event.error);
  });

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
        
        return parsedData.map(campaign => ({
            ...campaign,
            timerSettings: {
                ...campaign.timerSettings,
                textAr: decodeURIComponent(campaign.timerSettings.textAr || ''),
                textEn: decodeURIComponent(campaign.timerSettings.textEn || ''),
                autoRestart: campaign.timerSettings.autoRestart || false
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

  function isMobile() {
    return window.innerWidth <= 768;
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
    updateInterval: null,
    originalDurations: new Map(),

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
        padding: ${isMobile() ? '12px' : '20px'};
        z-index: 999999;
        display: none;
        direction: ${getCurrentLanguage() === 'ar' ? 'rtl' : 'ltr'};
        height: ${isMobile() ? 'auto' : '100px'};  // Added this line
      `;

      const wrapper = document.createElement('div');
      wrapper.style.cssText = `
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: ${isMobile() ? '8px' : '15px'};
        flex-wrap: ${isMobile() ? 'wrap' : 'nowrap'};
      `;

      // Quantity section container (for mobile layout)
      const quantityContainer = document.createElement('div');
      quantityContainer.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        width: ${isMobile() ? '100%' : 'auto'};
        background: #f8f8f8;
        border-radius: 8px;
        padding: ${isMobile() ? '8px 12px' : '4px'};
      `;

      // Optional: Add quantity label
      const quantityLabel = document.createElement('span');
      quantityLabel.textContent = getCurrentLanguage() === 'ar' ? 'الكمية:' : 'Quantity:';
      quantityLabel.style.cssText = `
        font-size: ${isMobile() ? '14px' : '12px'};
        color: #666;
        ${isMobile() ? 'min-width: 60px;' : ''}
      `;

      const quantityWrapper = document.createElement('div');
      quantityWrapper.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        background: #f5f5f5;
        border-radius: 4px;
        padding: 4px;
        ${isMobile() ? 'flex: 0 0 auto;' : ''}
      `;
      const decreaseBtn = document.createElement('button');
      decreaseBtn.textContent = '-';
      decreaseBtn.style.cssText = `
        width: ${isMobile() ? '40px' : '28px'};
        height: ${isMobile() ? '40px' : '28px'};
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f8f8f8;
        border: 1px solid #e5e5e5;
        border-radius: 6px;
        cursor: pointer;
        font-size: ${isMobile() ? '18px' : '16px'};
        color: #666;
        transition: all 0.2s ease;
        user-select: none;
        flex-shrink: 0;
      `;
    
      const quantityInput = document.createElement('input');
      quantityInput.type = 'number';
      quantityInput.min = '1';
      quantityInput.max = '10';
      quantityInput.value = '1';
      quantityInput.style.cssText = `
        width: ${isMobile() ? '60px' : '40px'};
        height: ${isMobile() ? '40px' : '28px'};
        text-align: center;
        border: 1px solid #e5e5e5;
        border-radius: 6px;
        background: white;
        font-size: ${isMobile() ? '16px' : '14px'};
        -moz-appearance: textfield;
        -webkit-appearance: none;
        margin: 0;
        padding: 0;
        ${isMobile() ? 'flex: 0 0 60px;' : ''};
      `;
    
      const increaseBtn = document.createElement('button');
      increaseBtn.textContent = '+';
      increaseBtn.style.cssText = `
        width: ${isMobile() ? '40px' : '28px'};
        height: ${isMobile() ? '40px' : '28px'};
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f8f8f8;
        border: 1px solid #e5e5e5;
        border-radius: 6px;
        cursor: pointer;
        font-size: ${isMobile() ? '18px' : '16px'};
        color: #666;
        transition: all 0.2s ease;
        user-select: none;
        flex-shrink: 0;
      `;
    
      // Add hover effects to buttons
      const addButtonHoverEffects = (button) => {
        button.addEventListener('mouseover', () => {
          button.style.background = '#f0f0f0';
        });
        button.addEventListener('mouseout', () => {
          button.style.background = '#f8f8f8';
        });
        button.addEventListener('mousedown', () => {
          button.style.background = '#e8e8e8';
        });
        button.addEventListener('mouseup', () => {
          button.style.background = '#f0f0f0';
        });
      };

      addButtonHoverEffects(decreaseBtn);
      addButtonHoverEffects(increaseBtn);
    
      const updateQuantity = (value) => {
        quantityInput.value = value;
        const originalSelect = document.querySelector('select#product-quantity');
        if (originalSelect) {
          originalSelect.value = value;
          const event = new Event('change', { bubbles: true });
          originalSelect.dispatchEvent(event);
        }
      };
    
      decreaseBtn.addEventListener('click', () => {
        const currentValue = parseInt(quantityInput.value);
        if (currentValue > 1) {
          updateQuantity(currentValue - 1);
        }
      });
    
      increaseBtn.addEventListener('click', () => {
        const currentValue = parseInt(quantityInput.value);
        if (currentValue < 10) {
          updateQuantity(currentValue + 1);
        }
      });
    
      quantityInput.addEventListener('change', (e) => {
        let value = parseInt(e.target.value);
        if (isNaN(value) || value < 1) value = 1;
        if (value > 10) value = 10;
        updateQuantity(value);
      });

      // Prevent scrolling when focusing input on mobile
      quantityInput.addEventListener('focus', (e) => {
        e.preventDefault();
        if (isMobile()) {
          quantityInput.blur();
        }
      });
    
      const addButton = document.createElement('button');
      addButton.textContent = getCurrentLanguage() === 'ar' ? 'أضف للسلة' : 'Add to Cart';
      addButton.style.cssText = `
        background-color: var(--theme-primary, #00b286);
        color: white;
        border: none;
        border-radius: 8px;
        height: ${isMobile() ? '48px' : '60px'};
        font-weight: 500;
        cursor: pointer;
        white-space: nowrap;
        transition: opacity 0.3s ease;
        flex: 1;  // Make it stretch in both mobile and desktop
        font-size: ${isMobile() ? '16px' : '16px'};
      `;

      addButton.addEventListener('mouseover', () => addButton.style.opacity = '0.9');
      addButton.addEventListener('mouseout', () => addButton.style.opacity = '1');
      addButton.addEventListener('click', () => {
        const originalSelect = document.querySelector('select#product-quantity');
        if (originalSelect) {
          originalSelect.value = quantityInput.value;
          const event = new Event('change', { bubbles: true });
          originalSelect.dispatchEvent(event);
        }
    
        const originalButton = document.querySelector('.btn.btn-add-to-cart');
        if (originalButton) {
          setTimeout(() => {
            originalButton.click();
          }, 100);
        }
      });

      // Assemble the quantity section
      quantityWrapper.appendChild(decreaseBtn);
      quantityWrapper.appendChild(quantityInput);
      quantityWrapper.appendChild(increaseBtn);
      quantityContainer.appendChild(quantityLabel);
      quantityContainer.appendChild(quantityWrapper);
    
      // Assemble the final structure
      wrapper.appendChild(quantityContainer);
      wrapper.appendChild(addButton);
      container.appendChild(wrapper);
      document.body.appendChild(container);
    
      this.stickyCartElement = container;
      // Add scroll event listener
      window.addEventListener('scroll', () => {
        const originalButton = document.querySelector('.btn.btn-add-to-cart');
        const originalSelect = document.querySelector('select#product-quantity');
        
        if (!originalButton) return;
    
        const buttonRect = originalButton.getBoundingClientRect();
        const isButtonVisible = buttonRect.top >= 0 && buttonRect.bottom <= window.innerHeight;
        
        if (!isButtonVisible) {
          container.style.display = 'block';
          if (originalSelect) {
            quantityInput.value = originalSelect.value;
          }
        } else {
          container.style.display = 'none';
        }
      });
    },

    findActiveCampaignForProduct(productId) {
      const now = new Date();
      const activeCampaign = this.campaigns.find(campaign => {
        if (!campaign.products || !Array.isArray(campaign.products)) {
          return false;
        }
    
        const hasProduct = campaign.products.some(p => p.id === productId);
    
        let endTime;
        try {
          endTime = campaign.endTime?._seconds ? 
            new Date(campaign.endTime._seconds * 1000) :
            new Date(campaign.endTime.seconds * 1000);
        } catch (error) {
          return false;
        }
    
        if (!(endTime instanceof Date && !isNaN(endTime))) {
          return false;
        }
    
        return hasProduct && (now <= endTime || campaign.timerSettings.autoRestart) && campaign.status === 'active';
      });
    
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
        padding: ${isMobile() ? '8px 10px' : '12px 15px'};
        margin: ${isMobile() ? '10px 0' : '15px 0'};
        border-radius: 8px;
        text-align: center;
        direction: ${getCurrentLanguage() === 'ar' ? 'rtl' : 'ltr'};
        display: flex;
        align-items: center;
        justify-content: center;
        gap: ${isMobile() ? '8px' : '12px'};
        font-size: ${isMobile() ? '12px' : '14px'};
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        flex-wrap: ${isMobile() ? 'wrap' : 'nowrap'};
        width: ${isMobile() ? '100%' : 'auto'};
      `;

      const textElement = document.createElement('span');
      const timerText = getCurrentLanguage() === 'ar' ? 
        campaign.timerSettings.textAr : 
        campaign.timerSettings.textEn;
      textElement.textContent = timerText;
      textElement.style.cssText = `
        font-weight: 500;
        ${isMobile() ? 'width: 100%; margin-bottom: 4px;' : ''}
      `;
        
      const timeElement = document.createElement('div');
      timeElement.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: bold;
        padding: 4px 8px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.15);
        ${isMobile() ? 'width: 100%; justify-content: center;' : ''}
      `;

      container.appendChild(textElement);
      container.appendChild(timeElement);

      let endTime = campaign.endTime?._seconds ? 
        new Date(campaign.endTime._seconds * 1000) :
        new Date(campaign.endTime.seconds * 1000);

      this.activeTimers.set(productId, {
        element: timeElement,
        endTime: endTime,
        campaign: campaign,
        originalDuration: this.originalDurations.get(campaign.id)
      });

      return container;
    },

    createProductCardTimer(campaign, productId) {
      const existingTimer = document.getElementById(`hmstudio-card-countdown-${productId}`);
      if (existingTimer) {
        existingTimer.remove();
        if (this.activeTimers.has(productId)) {
          clearInterval(this.activeTimers.get(productId));
          this.activeTimers.delete(productId);
        }
      }
    
      const container = document.createElement('div');
      container.id = `hmstudio-card-countdown-${productId}`;
    
      // Check if it's Perfect theme by looking for card-body
      const isPerfectTheme = document.querySelector('.card.card-product .card-body') !== null;
    
      container.style.cssText = `
        background: ${campaign.timerSettings.backgroundColor};
        color: ${campaign.timerSettings.textColor};
        padding: 4px;
        ${!isPerfectTheme ? 'margin-top: 30px !important;' : ''} 
        border-bottom-right-radius: 8px;
        border-bottom-left-radius: 8px;
        text-align: center;
        direction: ${getCurrentLanguage() === 'ar' ? 'rtl' : 'ltr'};
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        font-size: ${isMobile() ? '10px' : '12px'};
        width: 100%;
        overflow: hidden;
      `;

      const timeElement = document.createElement('div');
      timeElement.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
        gap: ${isMobile() ? '2px' : '4px'};
      `;

      container.appendChild(timeElement);

      let endTime = campaign.endTime?._seconds ? 
        new Date(campaign.endTime._seconds * 1000) :
        new Date(campaign.endTime.seconds * 1000);

      const startTime = campaign.startTime?._seconds ? 
        new Date(campaign.startTime._seconds * 1000) :
        new Date(campaign.startTime.seconds * 1000);

      const originalDuration = endTime - startTime;

      this.activeTimers.set(`card-${productId}`, {
        element: timeElement,
        endTime: endTime,
        campaign: campaign,
        originalDuration: originalDuration,
        isFlashing: false
      });

      return container;
    },

    // Add keyframes for flashing animation
    addFlashingStyleIfNeeded() {
      if (!document.getElementById('countdown-flash-animation')) {
        const style = document.createElement('style');
        style.id = 'countdown-flash-animation';
        style.textContent = `
          @keyframes countdown-flash {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
          .countdown-flash {
            animation: countdown-flash 1s ease-in-out infinite;
          }
        `;
        document.head.appendChild(style);
      }
    },

    updateAllTimers() {
      this.addFlashingStyleIfNeeded();
      const now = new Date();
      
      this.activeTimers.forEach((timer, id) => {
        if (!timer.element || !timer.endTime) return;

        let timeDiff = timer.endTime - now;

        // Handle auto-restart
        if (timeDiff <= 0 && timer.campaign?.timerSettings?.autoRestart && timer.originalDuration) {
          const newEndTime = new Date(now.getTime() + timer.originalDuration);
          timer.endTime = newEndTime;
          timeDiff = timer.originalDuration;
          timer.isFlashing = false;
          console.log(`Timer restarted for ${id}, new end time:`, newEndTime);
        } else if (timeDiff <= 0 && !timer.campaign?.timerSettings?.autoRestart) {
          const elementId = id.startsWith('card-') ? 
            `hmstudio-card-countdown-${id.replace('card-', '')}` :
            `hmstudio-countdown-${id}`;
          const element = document.getElementById(elementId);
          if (element) element.remove();
          this.activeTimers.delete(id);
          return;
        }

        // Check if we're in the last 5 minutes
        const isLastFiveMinutes = timeDiff <= 300000; // 5 minutes in milliseconds

        // Update flashing state if needed
        if (isLastFiveMinutes && !timer.isFlashing) {
          timer.isFlashing = true;
        } else if (!isLastFiveMinutes && timer.isFlashing) {
          timer.isFlashing = false;
        }

        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

        // Always include all time units
        const timeUnits = [
          {
            value: days,
            label: getCurrentLanguage() === 'ar' ? 'ي' : 'd'
          },
          {
            value: hours,
            label: getCurrentLanguage() === 'ar' ? 'س' : 'h'
          },
          {
            value: minutes,
            label: getCurrentLanguage() === 'ar' ? 'د' : 'm'
          },
          {
            value: seconds,
            label: getCurrentLanguage() === 'ar' ? 'ث' : 's'
          }
        ];

        const isCard = id.startsWith('card-');
        const scale = isCard ? (isMobile() ? 0.85 : 1) : 1;
        
        let html = `
          <div class="countdown-units-wrapper ${timer.isFlashing ? 'countdown-flash' : ''}" style="
            display: flex;
            align-items: center;
            justify-content: center;
            gap: ${isCard ? '2px' : '4px'};
            transform: scale(${scale});
            flex-wrap: ${isCard ? 'wrap' : 'nowrap'};
            ${isCard ? 'max-width: 100%; padding: 2px;' : ''}
          ">
        `;

        timeUnits.forEach((unit, index) => {
          html += `
            <div class="hmstudio-countdown-unit" style="
              display: inline-flex;
              align-items: center;
              white-space: nowrap;
              gap: ${isCard ? '1px' : '2px'};
              ${index < timeUnits.length - 1 ? `margin-${getCurrentLanguage() === 'ar' ? 'left' : 'right'}: ${isCard ? '2px' : '4px'};` : ''}
              ${isCard && index % 2 === 1 ? 'margin-right: 8px;' : ''}
            ">
              <span style="
                font-weight: bold;
                min-width: ${isCard ? '14px' : '20px'};
                text-align: center;
                font-size: ${isCard ? (isMobile() ? '11px' : '12px') : (isMobile() ? '12px' : '14px')};
              ">${String(unit.value).padStart(2, '0')}</span>
              <span style="
                font-size: ${isCard ? (isMobile() ? '9px' : '10px') : (isMobile() ? '10px' : '12px')};
                opacity: 0.8;
              ">${unit.label}</span>
              ${index < timeUnits.length - 1 ? `
                <span style="
                  margin-${getCurrentLanguage() === 'ar' ? 'right' : 'left'}: ${isCard ? '2px' : '4px'};
                  opacity: 0.8;
                ">:</span>
              ` : ''}
            </div>
          `;
        });

        html += '</div>';
        timer.element.innerHTML = html;
      });
    },

    setupProductCardTimers() {
      const productCardSelectors = [
        '.product-item',
        '.card.card-product'
      ];
    
      const processedCards = new Set();
      
      productCardSelectors.forEach(selector => {
        const productCards = document.querySelectorAll(selector);
        
        productCards.forEach(card => {
          let productId = null;
          const idSelectors = [
            '[data-wishlist-id]',
            'input[name="product_id"]',
            '#product-id',
            '.js-add-to-cart'
          ];
    
          for (const idSelector of idSelectors) {
            const element = card.querySelector(idSelector);
            if (element) {
              productId = element.getAttribute('data-wishlist-id') || 
                         element.getAttribute('onclick')?.match(/\'(.*?)\'/)?.[1] || 
                         element.value;
              break;
            }
          }
    
          if (productId && !processedCards.has(productId)) {
            processedCards.add(productId);
            
            const activeCampaign = this.findActiveCampaignForProduct(productId);
    
            if (activeCampaign) {
              const timer = this.createProductCardTimer(activeCampaign, productId);
    
              // Perfect theme
              const cardBody = card.querySelector('.card-body');
              if (cardBody) {
                const existingTimer = document.getElementById(`hmstudio-card-countdown-${productId}`);
                if (!existingTimer) {
                  cardBody.parentNode.insertBefore(timer, cardBody);
                }
              } else {
                // Soft theme
                const insertionPoints = [
                  '.content',
                  '.product-content'
                ];
    
                for (const selector of insertionPoints) {
                  const container = card.querySelector(selector);
                  if (container) {
                    const existingTimer = document.getElementById(`hmstudio-card-countdown-${productId}`);
                    if (!existingTimer) {
                      container.parentNode.insertBefore(timer, container.nextSibling);
                    }
                    break;
                  }
                }
              }
            }
          }
        });
      });
    },

    setupProductTimer() {
      let productId = null;
      
      const idSelectors = [
        {
          selector: '[data-wishlist-id]',
          attribute: 'data-wishlist-id'
        },
        {
          selector: '#product-form input[name="product_id"]',
          attribute: 'value'
        },
        {
          selector: '#product-id',
          attribute: 'value'
        },
        {
          selector: 'form#product-form input#product-id',
          attribute: 'value'
        }
      ];
    
      for (const {selector, attribute} of idSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          productId = element.getAttribute(attribute) || element.value;
          break;
        }
      }
    
      if (!productId) return;
    
      this.currentProductId = productId;
      const activeCampaign = this.findActiveCampaignForProduct(productId);
    
      if (!activeCampaign) return;

      const timer = this.createCountdownTimer(activeCampaign, productId);
    
      // First try to find the card element that comes before the list-group
      const cardElement = document.querySelector('.card.mb-3.border-secondary.border-opacity-10.shadow-sm');
      
      if (cardElement) {
        // Insert the timer right after the card element
        cardElement.parentNode.insertBefore(timer, cardElement.nextSibling);
      } else {
        // Fallback to other insertion points if the card element is not found
        const insertionPoints = [
          {
            container: '.js-product-price',
            method: 'before'
          },
          {
            container: '.product-formatted-price',
            method: 'before'
          },
          {
            container: '.js-details-section',
            method: 'prepend'
          },
          {
            container: '.js-product-old-price',
            method: 'before'
          },
          {
            container: '.hmstudio-cart-buttons',
            method: 'before'
          }
        ];
    
        for (const point of insertionPoints) {
          const container = document.querySelector(point.container);
          if (container) {
            if (point.method === 'before') {
              container.parentNode.insertBefore(timer, container);
            } else {
              container.insertBefore(timer, container.firstChild);
            }
            break;
          }
        }
      }
    
      this.createStickyCart();
    
      if (this.activeTimers.size > 0) {
        this.startTimerUpdates();
      }
    },

    startTimerUpdates() {
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
      }
      this.updateInterval = setInterval(() => this.updateAllTimers(), 1000);
    },

    stopTimerUpdates() {
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
    },

    initialize() {
      console.log('Initializing Smart Cart');
      
      this.stopTimerUpdates();
      
      // Check if we're on a product page using both themes' selectors
      const isProductPage = document.querySelector('.product.products-details-page') || 
                           document.querySelector('.js-details-section') ||
                           document.querySelector('#productId');
      
      if (isProductPage) {
        // Create sticky cart regardless of campaigns
        this.createStickyCart();
    
        // Setup timer if there's an active campaign
        const wishlistBtn = document.querySelector('[data-wishlist-id]');
        const productForm = document.querySelector('form[data-product-id]');
        const productId = wishlistBtn?.getAttribute('data-wishlist-id') || 
                         productForm?.getAttribute('data-product-id');
    
        if (productId) {
          const activeCampaign = this.findActiveCampaignForProduct(productId);
          if (activeCampaign) {
            this.setupProductTimer();
            if (this.activeTimers.size > 0) {
              this.startTimerUpdates();
            }
          }
        }
      } else {
        // Check if we're on a product listing page using both themes' selectors
        const productCards = document.querySelectorAll('.product-item, .card.card-product');
        
        if (productCards.length > 0) {
          this.setupProductCardTimers();
          if (this.activeTimers.size > 0) {
            this.startTimerUpdates();
          }
        }
      }
    
      // Add observer to handle dynamic content changes
      const observer = new MutationObserver(() => {
        if (isProductPage) {
          // Check if sticky cart needs to be recreated
          if (!document.getElementById('hmstudio-sticky-cart')) {
            this.createStickyCart();
          }
    
          // Check if timer needs to be updated
          if (this.currentProductId && !document.getElementById(`hmstudio-countdown-${this.currentProductId}`)) {
            this.setupProductTimer();
          }
        } else {
          // Check for product cards after mutation
          const currentCards = document.querySelectorAll('.product-item, .card.card-product');
          if (currentCards.length > 0) {
            this.setupProductCardTimers();
          }
        }
      });
    
      observer.observe(document.body, { 
        childList: true, 
        subtree: true 
      });
    
      // Start timer updates if needed
      if (this.activeTimers.size > 0) {
        this.startTimerUpdates();
      }
    }
  };

  window.addEventListener('beforeunload', () => {
    SmartCart.stopTimerUpdates();
  });

  // Handle mobile viewport changes
  window.addEventListener('resize', () => {
    if (SmartCart.stickyCartElement) {
      SmartCart.createStickyCart(); // Recreate sticky cart with updated mobile styles
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SmartCart.initialize());
  } else {
    SmartCart.initialize();
  }
})();
