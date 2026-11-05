const SUPABASE_URL = 'PASTE_YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = 'PASTE_YOUR_SUPABASE_ANON_KEY_HERE';
const CART_STORAGE_KEY = 'americanGeographerCartV2';
const CATALOG_CATEGORIES = new Set([
  'babban-riga',
  'jallabiya',
  'yar-ciki',
  'caps-accessories'
]);

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
  const supabaseClient = window.supabase && window.SUPABASE_CONFIG?.url && window.SUPABASE_CONFIG?.publishableKey
    ? window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.publishableKey)
    : null;
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
        typeof item.productId === 'string' &&
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

  const checkoutForm = document.createElement('form');
  checkoutForm.className = 'checkout-form';
  checkoutForm.id = 'checkoutForm';
  checkoutForm.hidden = true;
  checkoutForm.innerHTML = `
    <p class="checkout-intro">Delivery details</p>
    <label class="checkout-field">Full name
      <input name="customerName" type="text" autocomplete="name" minlength="2" maxlength="120" required />
    </label>
    <label class="checkout-field">Email
      <input name="customerEmail" type="email" autocomplete="email" required />
    </label>
    <label class="checkout-field">Phone
      <input name="customerPhone" type="tel" autocomplete="tel" minlength="5" maxlength="40" required />
    </label>
    <label class="checkout-field">Delivery address
      <textarea name="deliveryAddress" autocomplete="street-address" minlength="8" maxlength="500" required></textarea>
    </label>
    <p class="checkout-note">Payment is not collected online. We’ll confirm your order with you.</p>
  `;
  const backToBagButton = document.createElement('button');
  backToBagButton.className = 'cart-back-button';
  backToBagButton.type = 'button';
  backToBagButton.textContent = 'Back to bag';

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
  const checkoutFooter = document.createElement('div');
  checkoutFooter.className = 'cart-footer checkout-footer';
  checkoutFooter.hidden = true;
  const checkoutSubtotal = document.createElement('div');
  checkoutSubtotal.className = 'cart-subtotal';
  const checkoutSubtotalLabel = document.createElement('span');
  checkoutSubtotalLabel.textContent = 'Subtotal';
  const checkoutSubtotalAmount = document.createElement('strong');
  checkoutSubtotalAmount.dataset.checkoutSubtotal = '';
  checkoutSubtotal.append(checkoutSubtotalLabel, checkoutSubtotalAmount);
  const submitOrderButton = document.createElement('button');
  submitOrderButton.className = 'primary-btn cart-checkout';
  submitOrderButton.type = 'submit';
  submitOrderButton.setAttribute('form', checkoutForm.id);
  submitOrderButton.dataset.cartOrderSubmit = '';
  submitOrderButton.textContent = 'Place order';
  checkoutFooter.append(checkoutSubtotal, backToBagButton, submitOrderButton);
  drawer.append(drawerHeader, cartItems, checkoutForm, cartFooter, checkoutFooter);
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
    checkoutSubtotalAmount.textContent = formatCurrency(subtotal);
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
      decreaseButton.dataset.itemId = item.productId;
      decreaseButton.setAttribute('aria-label', `Remove one ${item.name}`);
      decreaseButton.textContent = '−';
      const quantity = document.createElement('span');
      quantity.textContent = String(item.quantity);
      const increaseButton = document.createElement('button');
      increaseButton.type = 'button';
      increaseButton.dataset.cartAction = 'increase';
      increaseButton.dataset.itemId = item.productId;
      increaseButton.setAttribute('aria-label', `Add one ${item.name}`);
      increaseButton.textContent = '+';
      quantityControls.append(decreaseButton, quantity, increaseButton);
      details.append(name, price, quantityControls);

      const removeButton = document.createElement('button');
      removeButton.className = 'cart-remove';
      removeButton.type = 'button';
      removeButton.dataset.cartAction = 'remove';
      removeButton.dataset.itemId = item.productId;
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
    } else {
      setCheckoutMode(false);
      if (lastCartTrigger) lastCartTrigger.focus();
    }
  };

  let checkoutMode = false;
  const setCheckoutMode = (isOpen) => {
    checkoutMode = isOpen;
    cartItems.hidden = isOpen;
    checkoutForm.hidden = !isOpen;
    cartFooter.hidden = isOpen;
    checkoutFooter.hidden = !isOpen;
    drawerTitle.textContent = isOpen ? 'Delivery details' : 'Your bag';
    if (isOpen) checkoutForm.querySelector('input')?.focus();
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

    const itemIndex = cart.findIndex((item) => item.productId === button.dataset.itemId);
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
    if (getCartCount() > 0) setCheckoutMode(true);
  });

  backToBagButton.addEventListener('click', () => setCheckoutMode(false));

  checkoutForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!supabaseClient) {
      showToast('Supabase is unavailable. Please try again later.', true);
      return;
    }

    const submitButton = drawer.querySelector('[data-cart-order-submit]');
    const formData = new FormData(checkoutForm);
    const customer = {
      p_customer_name: String(formData.get('customerName') || '').trim(),
      p_customer_email: String(formData.get('customerEmail') || '').trim(),
      p_customer_phone: String(formData.get('customerPhone') || '').trim(),
      p_delivery_address: String(formData.get('deliveryAddress') || '').trim(),
      p_items: cart.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity
      }))
    };

    submitButton.disabled = true;
    submitButton.textContent = 'Placing order...';
    try {
      const { data: orderId, error } = await supabaseClient.rpc('place_order', customer);
      if (error) throw error;

      cart = [];
      saveCart();
      renderCart();
      checkoutForm.reset();
      setCheckoutMode(false);
      setDrawerOpen(false);
      showToast(`Order placed. Reference: ${String(orderId).slice(0, 8).toUpperCase()}`);
    } catch (error) {
      console.error('Supabase order submission failed:', error);
      showToast(error.message || 'We could not place your order. Please try again.', true);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Place order';
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

  const searchCards = () => [...document.querySelectorAll('.product-card, .feature-card')];
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

    searchCards().forEach((card) => {
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

  document.addEventListener('click', (event) => {
    const button = event.target.closest('.add-button');
    if (!button) return;

    const card = button.closest('.product-card');
    const productId = card?.dataset.productId;
    const name = card?.querySelector('h5')?.textContent.trim();
    const priceText = card?.querySelector('.product-bottom strong')?.textContent.replace(/[^\d.]/g, '');
    const price = Number.parseFloat(priceText || '');
    if (!productId || !name || !Number.isFinite(price)) {
      showToast('This item could not be added to your bag.', true);
      return;
    }

    const existingItem = cart.find((item) => item.productId === productId);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({
        productId,
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

  const productGrid = document.querySelector('.product-grid');
  const showcaseList = document.querySelector('.showcase-list');
  const makeCatalogMessage = (message) => {
    const status = document.createElement('p');
    status.className = 'catalog-status';
    status.setAttribute('role', 'status');
    status.textContent = message;
    return status;
  };

  const makeProductCard = (product) => {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.dataset.productId = product.id;
    card.dataset.category = product.category;

    const imageContainer = document.createElement('div');
    imageContainer.className = 'product-image';
    const image = document.createElement('img');
    image.src = product.image_url;
    image.alt = product.name;
    image.loading = 'lazy';
    imageContainer.append(image);

    if (product.label) {
      const tag = document.createElement('span');
      tag.className = 'product-tag';
      tag.textContent = product.label;
      imageContainer.append(tag);
    }

    const name = document.createElement('h5');
    name.textContent = product.name;
    const description = document.createElement('p');
    description.textContent = product.description;
    const footer = document.createElement('div');
    footer.className = 'product-bottom';
    const price = document.createElement('strong');
    price.textContent = formatCurrency(product.price);
    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'add-button';
    addButton.setAttribute('aria-label', `Add ${product.name} to bag`);
    addButton.innerHTML = '<span class="material-symbols-outlined">add</span>';
    footer.append(price, addButton);
    card.append(imageContainer, name, description, footer);
    return card;
  };

  const makeFeatureCard = (product) => {
    const card = document.createElement('article');
    card.className = 'feature-card';
    card.dataset.productId = product.id;
    card.dataset.category = product.category;

    const imageContainer = document.createElement('div');
    imageContainer.className = 'feature-image';
    const image = document.createElement('img');
    image.src = product.image_url;
    image.alt = product.name;
    image.loading = 'lazy';
    imageContainer.append(image);

    const label = document.createElement('div');
    label.className = 'badge-box';
    label.textContent = product.label || 'Featured piece';
    const featureBadge = document.createElement('div');
    featureBadge.className = 'special-badge';
    featureBadge.textContent = 'Featured';
    imageContainer.append(label, featureBadge);

    const name = document.createElement('h4');
    name.textContent = product.name;
    const description = document.createElement('p');
    description.textContent = product.description;
    const footer = document.createElement('div');
    footer.className = 'feature-footer';
    const priceBlock = document.createElement('div');
    priceBlock.className = 'price-block';
    const price = document.createElement('strong');
    price.textContent = formatCurrency(product.price);
    priceBlock.append(price);
    const shopLink = document.createElement('a');
    shopLink.className = 'primary-btn';
    shopLink.href = `products.html?q=${encodeURIComponent(product.name)}`;
    shopLink.append(document.createTextNode('Shop now '));
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.textContent = 'arrow_forward';
    shopLink.append(icon);
    footer.append(priceBlock, shopLink);
    card.append(imageContainer, name, description, footer);
    return card;
  };

  const loadCatalog = async () => {
    if (!productGrid && !showcaseList) return;
    productGrid?.replaceChildren(makeCatalogMessage('Loading the collection…'));
    showcaseList?.replaceChildren(makeCatalogMessage('Loading featured pieces…'));

    if (!supabaseClient) {
      const message = 'The catalog connection is unavailable. Check the Supabase client and configuration.';
      productGrid?.replaceChildren(makeCatalogMessage(message));
      showcaseList?.replaceChildren(makeCatalogMessage(message));
      showToast(message, true);
      return;
    }

    try {
      const { data, error } = await supabaseClient
        .from('products')
        .select('id, name, description, price, category, image_url, label, featured')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const products = data.map((product) => {
        const price = Number(product.price);
        if (
          !product.id ||
          !product.name ||
          !CATALOG_CATEGORIES.has(product.category) ||
          !Number.isFinite(price) ||
          !product.image_url
        ) {
          throw new TypeError('A catalog record is missing a required field or has an invalid value.');
        }

        return {
          ...product,
          price,
          description: product.description || '',
          label: product.label || ''
        };
      });

      if (products.length === 0) {
        productGrid?.replaceChildren(makeCatalogMessage('The collection is being prepared. Please check back soon.'));
        showcaseList?.replaceChildren(makeCatalogMessage('Featured pieces will appear here soon.'));
        return;
      }

      if (productGrid) {
        productGrid.replaceChildren(...products.map(makeProductCard));
      }

      if (showcaseList) {
        const featuredProducts = products.filter((product) => product.featured).slice(0, 4);
        showcaseList.replaceChildren(
          ...(featuredProducts.length
            ? featuredProducts.map(makeFeatureCard)
            : [makeCatalogMessage('Featured pieces will appear here soon.')])
        );
      }

      applySearchAndFilter();
    } catch (error) {
      console.error('Supabase product catalog query failed:', error);
      const message = 'We could not load the collection. Check the Supabase products table and its access policy.';
      productGrid?.replaceChildren(makeCatalogMessage(message));
      showcaseList?.replaceChildren(makeCatalogMessage(message));
      showToast(message, true);
    }
  };

  void loadCatalog();
});
