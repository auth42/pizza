// URL mapping, from hash to a function that responds to that URL action
const router = {
  "/": () => showContent("content-home"),
  "/profile": () =>
    requireAuth(() => showContent("content-profile"), "/profile"),
  "/login": () => login()
};

//Declare helper functions

/**
 * Iterates over the elements matching 'selector' and passes them
 * to 'fn'
 * @param {*} selector The CSS selector to find
 * @param {*} fn The function to execute for every element
 */
const eachElement = (selector, fn) => {
  for (let e of document.querySelectorAll(selector)) {
    fn(e);
  }
};

/**
 * Tries to display a content panel that is referenced
 * by the specified route URL. These are matched using the
 * router, defined above.
 * @param {*} url The route URL
 */
const showContentFromUrl = (url) => {
  if (router[url]) {
    router[url]();
    return true;
  }

  return false;
};

/**
 * Returns true if `element` is a hyperlink that can be considered a link to another SPA route
 * @param {*} element The element to check
 */
const isRouteLink = (element) =>
  element.tagName === "A" && element.classList.contains("route-link");

/**
 * Displays a content panel specified by the given element id.
 * All the panels that participate in this flow should have the 'page' class applied,
 * so that it can be correctly hidden before the requested content is shown.
 * @param {*} id The id of the content to show
 */
const showContent = (id) => {
  eachElement(".page", (p) => p.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
};

/**
 * Updates the user interface
 */
const updateUI = async () => {
  try {
    const isAuthenticated = await auth0.isAuthenticated();

    if (isAuthenticated) {
      const user = await auth0.getUser();

      

      document.querySelectorAll("pre code").forEach(hljs.highlightBlock);

      eachElement(".profile-image", (e) => (e.src = user.picture));
      eachElement(".user-name", (e) => (e.innerText = user.name));
      eachElement(".user-email", (e) => (e.innerText = user.email));
      eachElement(".auth-invisible", (e) => e.classList.add("hidden"));
      eachElement(".auth-visible", (e) => e.classList.remove("hidden"));
    } else {
      eachElement(".auth-invisible", (e) => e.classList.remove("hidden"));
      eachElement(".auth-visible", (e) => e.classList.add("hidden"));
    }
  } catch (err) {
    console.log("Error updating UI!", err);
    return;
  }

  console.log("UI updated");
};

const addPizzaToCart = (pizzaItem) => {
  var cart = getCart();
  var pizzaObj = {
    pizzaId: pizzaItem.data('pizza-id'),
    title: pizzaItem.find('.pizza-title').text(),
    price: pizzaItem.find('.price span').text(),
  }
  cart.push(pizzaObj);
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCart();
  showCart();
}

const showCart = () => {
  var cartContent = $('#cartContent');
  Swal.fire({
    customClass: {
      content: 'cart',
      confirmButton: 'btn btn-lg btn-warning cart-action-btn',
      cancelButton: 'btn btn-lg btn-default cart-action-btn'
    },
    buttonsStyling: false,
    title: '<strong>Cart</strong>',
    html: cartContent.html(),
    showCloseButton: true,
    showCancelButton: true,
    focusConfirm: false,
    confirmButtonText:
      'Place Order',
    cancelButtonText:
      'Clear cart',
  }).then((result) => {
    if (result.isConfirmed) {
      var cart = getCart();
      if(!cart.length) {
        swal.fire("Cart is empty", "", "warning");
        return;
      }
      callPizzaOrderApi(cart, (success, response) => {
        if(success) {
          Swal.fire('Order placed', '', 'success')
          clearCart();
          renderCart();
        } else {
          Swal.fire('Sorry!', response, 'error')
        }
      });
    } else if (result.isDismissed && result.dismiss == "cancel") {
      //Clear cart
      clearCart();
      renderCart();
      showCart();
    }
  })
}

const getCart = () => {
  var cart = localStorage.getItem('cart') ? JSON.parse(localStorage.getItem('cart')) : [];
  return cart;
}
const clearCart = () => {
  localStorage.setItem('cart', JSON.stringify([]));
}
const renderCart = () => {
  var cartContent = $('#cartContent');
  var cart = getCart();
  cartContent.html(cart.length ? '' : 'Your cart is empty');
  cart.forEach((item) => {
    cartContent.append(_.template($('#cartItemTemplate').html())(item));
  });
  $('#cartItemsCount').text(cart.length);
}
(async () => {
  renderCart();
  $('#viewCartBtn').click( () => {
    showCart();
    return false;
  })
  $('.order-button').click(async (e) => {
    var pizzaItem = $(e.target).parents('.pizza-item');
    console.log(pizzaItem);
    const isAuthenticated = await auth0.isAuthenticated();
    if(!isAuthenticated) {
      swal.fire({
        title: "Login or signup to order",
        confirmButtonText: "Login/Signup",
        customClass: {
          confirmButton: 'btn btn-lg btn-warning cart-action-btn'
        },
        buttonsStyling: false}).then((result) => {
          if (result.isConfirmed) {
            return login();
          }
      });
    } else {
      addPizzaToCart(pizzaItem);
    }
    return false;
  });
})();

window.onpopstate = (e) => {
  if (e.state && e.state.url && router[e.state.url]) {
    showContentFromUrl(e.state.url);
  }
};
