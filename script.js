const SUPABASE_URL = 'PASTE_YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = 'PASTE_YOUR_SUPABASE_ANON_KEY_HERE';
const CART_STORAGE_KEY = 'americanGeographerCart';

const isSupabaseConfigured = () => {
  return SUPABASE_URL && SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes('PASTE_') &&
    !SUPABASE_ANON_KEY.includes('PASTE_');
};

const showToast = (message, isError = false) => {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('aria-live', 'polite');
    document.body.append(toast);
  }

  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 2600);
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(amount);
};

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  let cart = [];
  let lastCartTrigger = null;

  try {
    const savedCart = window.localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart) {
      const parsedCart = JSON.parse(savedCart);
      if (!Array.isArray(parsedCart)) {
        throw new TypeError('Saved shopping bag data must be an array.');
      }

      cart = parsedCart.filter((item) =>
        item &&
        typeof item.name === 'string' &&
        Number.isFinite(item.price) &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0
      );
      if (cart.length !== parsedCart.length) {
        showToast('Some saved bag items could not be restored.', true);
      }
    }
  } catch (error) {
    console.error('Could not load the saved shopping bag:', error);
    showToast('Your saved bag could not be loaded.', true);
  }

  const drawerOverlay = document.createElement('button');
  drawerOverlay.className = 'cart-overlay';
  drawerOverlay.type = 'button';
  drawerOverlay.setAttribute('aria-label', 'Close shopping bag');

  const drawer = document.createElement('aside');
  drawer.className = 'cart-drawer';
  drawer.id = 'cartDrawer';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'true');
  drawer.setAttribute('aria-labelledby', 'cartTitle');
  drawer.setAttribute('aria-hidden', 'true');

  const drawerHeader = document.createElement('div');
  drawerHeader.className = 'cart-drawer-header';
  const drawerTitle = document.createElement('h2');
  drawerTitle.id = 'cartTitle';
  drawerTitle.textContent = 'Your bag';
  const closeButton = document.createElement('button');
  closeButton.className = 'header-icon-button cart-close';
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Close shopping bag');
  closeButton.innerHTML = '<span class="material-symbols-outlined">close</span>';
  drawerHeader.append(drawerTitle, closeButton);

  const cartItems = document.createElement('div');
  cartItems.className = 'cart-items';
  cartItems.dataset.cartItems = '';

  const cartFooter = document.createElement('div');
  cartFooter.className = 'cart-footer';
  const subtotalRow = document.createElement('div');
  subtotalRow.className = 'cart-subtotal';
  const subtotalLabel = document.createElement('span');
  subtotalLabel.textContent = 'Subtotal';
  const subtotalAmount = document.createElement('strong');
  subtotalAmount.dataset.cartSubtotal = '';
  subtotalRow.append(subtotalLabel, subtotalAmount);
  const checkoutButton = document.createElement('button');
  checkoutButton.className = 'primary-btn cart-checkout';
  checkoutButton.type = 'button';
  checkoutButton.dataset.cartCheckout = '';
  checkoutButton.textContent = 'Checkout';
  cartFooter.append(subtotalRow, checkoutButton);
  drawer.append(drawerHeader, cartItems, cartFooter);
  document.body.append(drawerOverlay, drawer);

  const getCartCount = () => cart.reduce((total, item) => total + item.quantity, 0);

  const saveCart = () => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
      console.error('Could not save the shopping bag:', error);
      showToast('Your bag could not be saved on this device.', true);
    }
  };

  const renderCart = () => {
    const itemCount = getCartCount();
    const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);

    document.querySelectorAll('[data-cart-count]').forEach((badge) => {
      badge.textContent = String(itemCount);
    });
    document.querySelectorAll('.cart-toggle').forEach((button) => {
      button.setAttribute('aria-label', `Shopping bag, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`);
    });

    cartItems.replaceChildren();
    subtotalAmount.textContent = formatCurrency(subtotal);
    checkoutButton.disabled = itemCount === 0;

    if (cart.length === 0) {
      const emptyMessage = document.createElement('p');
      emptyMessage.className = 'cart-empty';
      emptyMessage.textContent = 'Your bag is waiting for something good.';
      cartItems.append(emptyMessage);
      return;
    }

    cart.forEach((item) => {
      const row = document.createElement('article');
      row.className = 'cart-item';

      const image = document.createElement('img');
      image.className = 'cart-item-image';
      image.src = item.image;
      image.alt = item.name;
      image.loading = 'lazy';

      const details = document.createElement('div');
      details.className = 'cart-item-details';
      const name = document.createElement('h3');
      name.textContent = item.name;
      const price = document.createElement('p');
      price.className = 'cart-item-price';
      price.textContent = formatCurrency(item.price);

      const quantityControls = document.createElement('div');
      quantityControls.className = 'cart-quantity';
      const decreaseButton = document.createElement('button');
      decreaseButton.type = 'button';
      decreaseButton.dataset.cartAction = 'decrease';
      decreaseButton.dataset.itemName = item.name;
      decreaseButton.setAttribute('aria-label', `Remove one ${item.name}`);
      decreaseButton.textContent = '−';
      const quantity = document.createElement('span');
      quantity.textContent = String(item.quantity);
      const increaseButton = document.createElement('button');
      increaseButton.type = 'button';
      increaseButton.dataset.cartAction = 'increase';
      increaseButton.dataset.itemName = item.name;
      increaseButton.setAttribute('aria-label', `Add one ${item.name}`);
      increaseButton.textContent = '+';
      quantityControls.append(decreaseButton, quantity, increaseButton);
      details.append(name, price, quantityControls);

      const removeButton = document.createElement('button');
      removeButton.className = 'cart-remove';
      removeButton.type = 'button';
      removeButton.dataset.cartAction = 'remove';
      removeButton.dataset.itemName = item.name;
      removeButton.setAttribute('aria-label', `Remove ${item.name} from bag`);
      removeButton.innerHTML = '<span class="material-symbols-outlined">delete</span>';
      row.append(image, details, removeButton);
      cartItems.append(row);
    });
  };

  const setDrawerOpen = (isOpen) => {
    document.body.classList.toggle('cart-open', isOpen);
    drawer.classList.toggle('is-open', isOpen);
    drawerOverlay.classList.toggle('is-open', isOpen);
    drawer.setAttribute('aria-hidden', String(!isOpen));

    if (isOpen) {
      closeButton.focus();
    } else if (lastCartTrigger) {
      lastCartTrigger.focus();
    }
  };

  renderCart();

  document.querySelectorAll('.cart-toggle').forEach((button) => {
    button.addEventListener('click', () => {
      lastCartTrigger = button;
      setDrawerOpen(true);
    });
  });
  closeButton.addEventListener('click', () => setDrawerOpen(false));
  drawerOverlay.addEventListener('click', () => setDrawerOpen(false));

  drawer.addEventListener('click', (event) => {
    const button = event.target.closest('[data-cart-action]');
    if (!button) return;

    const itemIndex = cart.findIndex((item) => item.name === button.dataset.itemName);
    if (itemIndex < 0) return;

    if (button.dataset.cartAction === 'increase') {
      cart[itemIndex].quantity += 1;
    } else if (button.dataset.cartAction === 'decrease') {
      cart[itemIndex].quantity -= 1;
      if (cart[itemIndex].quantity === 0) cart.splice(itemIndex, 1);
    } else {
      cart.splice(itemIndex, 1);
    }

    saveCart();
    renderCart();
  });

  checkoutButton.addEventListener('click', () => {
    if (getCartCount() > 0) {
      showToast('Checkout is not connected yet. Your bag is saved.');
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && drawer.classList.contains('is-open')) {
      setDrawerOpen(false);
    }
  });

  window.addEventListener('storage', (event) => {
    if (event.key !== CART_STORAGE_KEY) return;
    try {
      cart = event.newValue ? JSON.parse(event.newValue) : [];
      if (!Array.isArray(cart)) throw new TypeError('Saved shopping bag data must be an array.');
      renderCart();
    } catch (error) {
      console.error('Could not sync the shopping bag:', error);
      showToast('The shopping bag could not be synced.', true);
    }
  });

  const searchPanel = document.querySelector('.search-panel');
  const searchInput = searchPanel?.querySelector('input[type="search"]');
  const searchToggle = document.querySelector('.search-toggle');
  const searchQuery = new URLSearchParams(window.location.search).get('q')?.trim() || '';
  if (searchInput && searchQuery) {
    searchInput.value = searchQuery;
    searchPanel.classList.add('is-open');
    searchToggle?.setAttribute('aria-expanded', 'true');
    searchToggle?.setAttribute('aria-label', 'Close product search');
    const searchIcon = searchToggle?.querySelector('.material-symbols-outlined');
    if (searchIcon) searchIcon.textContent = 'close';
  }

  const searchCards = [...document.querySelectorAll('.product-card, .feature-card')];
  const searchStatus = document.createElement('p');
  searchStatus.className = 'search-empty-state';
  searchStatus.setAttribute('role', 'status');
  searchStatus.hidden = true;
  const searchAnchor = document.querySelector('.product-grid, .showcase-list');
  if (searchAnchor) {
    searchAnchor.before(searchStatus);
  } else {
    document.querySelector('main')?.append(searchStatus);
  }

  const applySearchAndFilter = () => {
    const term = searchInput?.value.trim().toLocaleLowerCase() || '';
    const activeFilter = document.querySelector('.filter-chip.active')?.dataset.filter || 'all';
    let visibleCount = 0;

    searchCards.forEach((card) => {
      const matchesSearch = !term || card.textContent.toLocaleLowerCase().includes(term);
      const matchesCategory = !card.classList.contains('product-card') ||
        activeFilter === 'all' ||
        card.dataset.category === activeFilter;
      card.hidden = !matchesSearch || !matchesCategory;
      if (!card.hidden) visibleCount += 1;
    });

    searchStatus.hidden = !term || visibleCount > 0;
    searchStatus.textContent = `No pieces found for “${searchInput?.value.trim() || ''}”. Try another search.`;
  };

  searchToggle?.addEventListener('click', () => {
    const isOpen = searchPanel.classList.toggle('is-open');
    searchToggle.setAttribute('aria-expanded', String(isOpen));
    searchToggle.setAttribute('aria-label', isOpen ? 'Close product search' : 'Open product search');
    searchToggle.querySelector('.material-symbols-outlined').textContent = isOpen ? 'close' : 'search';
    if (isOpen) searchInput.focus();
  });
  searchInput?.addEventListener('input', () => {
    if (searchInput.value.trim()) {
      document.querySelectorAll('.filter-chip').forEach((chip) => {
        chip.classList.toggle('active', chip.dataset.filter === 'all');
      });
    }
    applySearchAndFilter();
  });
  if (searchQuery) applySearchAndFilter();

  document.querySelectorAll('.nav-item').forEach((item) => {
    const href = item.getAttribute('href');
    if (page && href && href.includes(page + '.html')) {
      item.classList.add('active');
    }
  });

  document.querySelectorAll('.add-button').forEach((button) => {
    button.addEventListener('click', () => {
      const card = button.closest('.product-card');
      const name = card?.querySelector('h5')?.textContent.trim();
      const priceText = card?.querySelector('.product-bottom strong')?.textContent.replace(/[^\d.]/g, '');
      const price = Number.parseFloat(priceText || '');
      if (!name || !Number.isFinite(price)) {
        showToast('This item could not be added to your bag.', true);
        return;
      }

      const existingItem = cart.find((item) => item.name === name);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        cart.push({
          name,
          price,
          quantity: 1,
          image: card.querySelector('img')?.getAttribute('src') || '',
          category: card.dataset.category || ''
        });
      }

      saveCart();
      renderCart();
      button.classList.add('success');
      const icon = button.querySelector('.material-symbols-outlined');
      if (icon) {
        const previousIcon = icon.textContent;
        icon.textContent = 'done';
        window.setTimeout(() => {
          icon.textContent = previousIcon;
          button.classList.remove('success');
        }, 1000);
      }
      showToast(`${name} added to your bag.`);
    });
  });

  const form = document.querySelector('#contactForm');

  if (form) {
    const submitButton = form.querySelector('button[type="submit"]');
    const supabase = isSupabaseConfigured() && window.supabase
      ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      : null;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const name = form.querySelector('#name')?.value.trim();
      const email = form.querySelector('#email')?.value.trim();
      const message = form.querySelector('#message')?.value.trim();

      if (!name || !email || !message) {
        showToast('Please fill in all fields.', true);
        return;
      }

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';
      }

      try {
        if (supabase) {
          const { error } = await supabase
            .from('contact_messages')
            .insert([{ name, email, message }]);

          if (error) {
            throw error;
          }

          showToast('Message sent successfully!');
        } else {
          showToast('Supabase is not connected yet. Add your URL and anon key first.');
        }
      } catch (error) {
        console.error('Supabase insert failed:', error);
        showToast('Something went wrong. Please try again later.', true);
      } finally {
        form.reset();

        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = 'Send message';
        }
      }
    });
  }

  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      navItems.forEach((nav) => nav.classList.remove('active'));
      item.classList.add('active');
    });
  });

  document.querySelectorAll('.filter-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const filterRow = chip.closest('.filter-row');
      if (!filterRow) return;

      filterRow.querySelectorAll('.filter-chip').forEach((el) => el.classList.remove('active'));
      chip.classList.add('active');
      applySearchAndFilter();
    });
  });
});
