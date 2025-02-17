// src/scripts/smartCart.js v1.9.1
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
      console.log('Finding campaign for product:', productId);
      console.log('Available campaigns:', this.campaigns);
    
      const now = new Date();
      const activeCampaign = this.campaigns.find(campaign => {
        if (!campaign.products || !Array.isArray(campaign.products)) {
          console.log('Campaign has no products array:', campaign);
          return false;
        }
    
        const hasProduct = campaign.products.some(p => p.id === productId);
        console.log('Product in campaign:', hasProduct);
    
        let endTime;
        try {
          endTime = campaign.endTime?._seconds ? 
            new Date(campaign.endTime._seconds * 1000) :
            new Date(campaign.endTime.seconds * 1000);
          console.log('Campaign end time:', endTime);
        } catch (error) {
          console.log('Error parsing end time:', error);
          return false;
        }
    
        if (!(endTime instanceof Date && !isNaN(endTime))) {
          console.log('Invalid end time');
          return false;
        }
    
        return hasProduct && (now <= endTime || campaign.timerSettings.autoRestart) && campaign.status === 'active';
      });
    
      console.log('Found active campaign:', activeCampaign);
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
      }
    
      const container = document.createElement('div');
      container.id = `hmstudio-card-countdown-${productId}`;
      container.style.cssText = `
        background: ${campaign.timerSettings.backgroundColor};
        color: ${campaign.timerSettings.textColor};
        padding: 8px;
        margin: 8px 0;
        border-radius: 4px;
        text-align: center;
        direction: ${getCurrentLanguage() === 'ar' ? 'rtl' : 'ltr'};
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        font-size: 12px;
        width: 100%;
        z-index: 10;
        position: relative;
      `;
    
      const timeElement = document.createElement('div');
      timeElement.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
      `;
    
      container.appendChild(timeElement);
    
      this.activeTimers.set(`card-${productId}`, {
        element: timeElement,
        endTime: new Date(campaign.endTime._seconds * 1000),
        campaign: campaign,
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
      console.log('Setting up product card timers...');
      // At the start of the function
  // Clear existing timers for products that might be reprocessed
  const existingTimers = document.querySelectorAll('[id^="hmstudio-card-countdown-"]');
  existingTimers.forEach(timer => {
    const productId = timer.id.replace('hmstudio-card-countdown-', '');
    this.activeTimers.delete(`card-${productId}`);
    timer.remove();
  });
      
      // Support both themes' product card structures
      const productCardSelectors = [
        '.product-item', // Soft theme
        '.card.card-product' // Perfect theme
      ];
    
      productCardSelectors.forEach(selector => {
        const productCards = document.querySelectorAll(selector);
        console.log(`Found ${productCards.length} cards with selector: ${selector}`);
        
        productCards.forEach(card => {
          let productId = null;
          console.log('Checking card for product ID:', card);
    
          // Try multiple selectors for product ID
          const idSelectors = [
            '[data-wishlist-id]',  // Soft theme
            'input[name="product_id"]', // Perfect theme
            '#product-id', // Perfect theme alternate
            '.js-add-to-cart' // Perfect theme button
          ];
    
          for (const idSelector of idSelectors) {
            const element = card.querySelector(idSelector);
            console.log('Trying selector:', idSelector, 'Found element:', element);
            if (element) {
              productId = element.getAttribute('data-wishlist-id') || 
                         element.getAttribute('onclick')?.match(/\'(.*?)\'/)?.[1] || 
                         element.value;
              console.log('Found product ID:', productId, 'using selector:', idSelector);
              break;
            }
          }
    
          if (productId) {
            console.log('Processing product ID:', productId);
            
            const activeCampaign = this.findActiveCampaignForProduct(productId);
            console.log('Active campaign for product:', activeCampaign);
    
            if (activeCampaign) {
              const timer = this.createProductCardTimer(activeCampaign, productId);
              console.log('Created timer for product card');
    
              // Define insertion points here, inside the scope where we need them
              const insertTimer = (card, timer, productId) => {
                // Try different insertion points in order of preference
                const insertionPoints = [
                  {
                    selector: '.card-body',
                    method: 'append'
                  },
                  {
                    selector: '.js-card-top',
                    method: 'after'
                  },
                  {
                    selector: '.border-0.border-secondary.border-opacity-10',
                    method: 'before'
                  },
                  {
                    selector: '.card-footer',
                    method: 'prepend'
                  }
                ];
              
                for (const point of insertionPoints) {
                  const container = card.querySelector(point.selector);
                  if (container) {
                    const existingTimer = document.getElementById(`hmstudio-card-countdown-${productId}`);
                    if (existingTimer) {
                      existingTimer.remove();
                    }
              
                    switch (point.method) {
                      case 'append':
                        container.appendChild(timer);
                        break;
                      case 'prepend':
                        container.insertBefore(timer, container.firstChild);
                        break;
                      case 'after':
                        container.parentNode.insertBefore(timer, container.nextSibling);
                        break;
                      case 'before':
                        container.parentNode.insertBefore(timer, container);
                        break;
                    }
                    console.log(`Timer inserted using selector: ${point.selector} with method: ${point.method}`);
                    return true;
                  }
                }
              
                // Fallback: insert at the start of the card
                card.insertBefore(timer, card.firstChild);
                console.log('Timer inserted at start of card (fallback)');
                return true;
              };
              
              // In your card processing loop:
              if (productId && activeCampaign) {
                const timer = this.createProductCardTimer(activeCampaign, productId);
                if (timer) {
                  insertTimer(card, timer, productId);
                }
              }
            }
          } else {
            console.log('No product ID found for card:', card);
          }
        });
      });
    },

    setupProductTimer() {
      console.log('Setting up product timer for detail page');
    
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
    
      console.log('Searching for product ID using selectors:', idSelectors);
    
      for (const {selector, attribute} of idSelectors) {
        const element = document.querySelector(selector);
        console.log('Trying selector:', selector, 'Found element:', element);
        
        if (element) {
          productId = element.getAttribute(attribute) || element.value;
          console.log('Found product ID:', productId, 'using selector:', selector);
          break;
        }
      }
    
      if (!productId) {
        console.log('No product ID found on page');
        return;
      }
    
      this.currentProductId = productId;
      const activeCampaign = this.findActiveCampaignForProduct(productId);
      console.log('Active campaign:', activeCampaign);
    
      if (!activeCampaign) {
        console.log('No active campaign found');
        return;
      }
    
      const timer = this.createCountdownTimer(activeCampaign, productId);
      console.log('Created countdown timer');
    
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
    
      let inserted = false;
      for (const point of insertionPoints) {
        const container = document.querySelector(point.container);
        if (container) {
          if (point.method === 'before') {
            container.parentNode.insertBefore(timer, container);
          } else {
            container.insertBefore(timer, container.firstChild);
          }
          inserted = true;
          console.log('Timer inserted using selector:', point.container);
          break;
        }
      }
    
      if (!inserted) {
        console.log('Could not find insertion point for timer');
      }
    
      // Create sticky cart after setting up timer
      this.createStickyCart();
    
      // Start the interval to update timers
      if (this.activeTimers.size > 0) {
        this.startTimerUpdates();
        console.log('Timer updates started');
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
      console.log('Initializing Smart Cart with campaigns:', this.campaigns);
      
      this.stopTimerUpdates();

      // Add these styles to ensure timers are visible
  const style = document.createElement('style');
  style.textContent = `
    .card.card-product {
      overflow: visible !important;
    }
    [id^="hmstudio-card-countdown-"] {
      opacity: 1 !important;
      visibility: visible !important;
      display: flex !important;
    }
  `;
  document.head.appendChild(style);
    
      // Card selectors for both themes
      const productCardSelectors = [
        '.product-item',                          // Soft theme
        '.card.card-product',                     // Perfect theme
        '.col .card',                             // Perfect theme alternate
        '[data-wishlist-id]'                      // Generic product container
      ];
    
      // Check if we're on a product detail page
      const isProductPage = document.querySelector([
        '.product.products-details-page',         // Soft theme
        '.js-details-section',                    // Perfect theme
        '#js-details-id',                         // Perfect theme alternate
        '.products-details'                       // Generic product detail
      ].join(','));
    
      console.log('Is product page:', !!isProductPage);
    
      if (isProductPage) {
        console.log('On product page, setting up timer');
        this.createStickyCart();
        this.setupProductTimer();
      } else {
        // Check if we're on a product listing page by trying all selectors
        let hasProductCards = false;
        for (const selector of productCardSelectors) {
          const cards = document.querySelectorAll(selector);
          if (cards.length > 0) {
            hasProductCards = true;
            console.log(`Found ${cards.length} product cards with selector: ${selector}`);
            break;
          }
        }
    
        if (hasProductCards) {
          console.log('On product listing page, setting up card timers');
          this.setupProductCardTimers();
    
          if (this.activeTimers.size > 0) {
            this.startTimerUpdates();
          }
        }
      }
    
      // Add observer to handle dynamic content changes
      const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          if (mutation.type === 'childList' && mutation.addedNodes.length) {
            const hasNewCards = [...mutation.addedNodes].some(node => {
              if (node.nodeType === 1) { // Element node
                return productCardSelectors.some(selector => 
                  node.matches(selector) || node.querySelector(selector)
                );
              }
              return false;
            });
    
            if (hasNewCards) {
              console.log('New product cards detected, updating timers');
              this.setupProductCardTimers();
              
              if (this.activeTimers.size > 0 && !this.updateInterval) {
                this.startTimerUpdates();
              }
            }
          }
        });
      });
    
      observer.observe(document.body, { 
        childList: true, 
        subtree: true 
      });
    
      console.log('Mutation observer set up');
    
    
      // Start timer updates if needed
      if (this.activeTimers.size > 0) {
        console.log('Starting timer updates');
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
