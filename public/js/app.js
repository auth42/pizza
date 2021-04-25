// The Auth0 client, initialized in configureClient()
let auth0 = null;
let defaultScope = 'openid profile email create:orders';

/**
 * Starts the authentication flow
 */
const login = async (targetUrl, signup) => {
  signup = signup ? signup : false;
  try {
    console.log("Logging in", targetUrl);

    const options = {
      redirect_uri: window.location.origin,
      scope: defaultScope,
    };
    if(signup) {
      options.screen_hint = 'signup';
    }

    if (targetUrl) {
      options.appState = { targetUrl };
    }

    await auth0.loginWithRedirect(options);
  } catch (err) {
    console.log("Log in failed", err);
  }
};

/**
 * Executes the logout flow
 */
const logout = () => {
  try {
    console.log("Logging out");
    auth0.logout({
      returnTo: window.location.origin
    });
  } catch (err) {
    console.log("Log out failed", err);
  }
};

/**
 * Retrieves the auth configuration from the server
 */
const fetchAuthConfig = () => fetch("/auth_config.json");

/**
 * Initializes the Auth0 client
 */
const configureClient = async () => {
  const response = await fetchAuthConfig();
  const config = await response.json();

  auth0 = await createAuth0Client({
    domain: config.domain,
    client_id: config.clientId,
    audience: config.audience
  });
};

/**
 * Checks to see if the user is authenticated. If so, `fn` is executed. Otherwise, the user
 * is prompted to log in
 * @param {*} fn The function to execute if the user is logged in
 */
const requireAuth = async (fn, targetUrl) => {
  const isAuthenticated = await auth0.isAuthenticated();

  if (isAuthenticated) {
    return fn();
  }

  return login(targetUrl);
};

/**
 * Calls the API endpoint with an authorization token
 */
const callPizzaOrderApi = async (cart, callback) => {
  try {
    const token = await auth0.getTokenSilently({
      scope: defaultScope
    });
    const userDetails = await auth0.getUser();
    if(!userDetails.email_verified) {
      Swal.fire({
        title: 'Verify your email',
        html: '<b>We have sent you a verification email.</b><br>Check your inbox and verify your email via the link in the email. <br>Once you have verified, reload the page and try again.',
      confirmButtonText: "Okay",
      customClass: {
          confirmButton: 'btn btn-warning'
        },
      buttonsStyling: false
      })
      return;
    }

    await fetch("/api/orders", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cart)
    })
    .then(result => {
      if(result.status != 200 && result.statusText == "Forbidden") {
        callback(false, "Not enough permissions. Login again and grant all permissions to place order.<br><span class='btn btn-warning' onclick='login()'>Login again</span>");
        return;
      }
      console.log('Success:', result);
      callback(true, result);
    })
    .catch(error => {
      callback(false, error);
    });
  } catch (e) {
    console.error(e);
  }
};


// Will run when page finishes loading
window.onload = async () => {
  await configureClient();

  // If unable to parse the history hash, default to the root URL
  if (!showContentFromUrl(window.location.pathname)) {
    showContentFromUrl("/");
    window.history.replaceState({ url: "/" }, {}, "/");
  }

  const bodyElement = document.getElementsByTagName("body")[0];

  // Listen out for clicks on any hyperlink that navigates to a #/ URL
  bodyElement.addEventListener("click", (e) => {
    if (isRouteLink(e.target)) {
      const url = e.target.getAttribute("href");

      if (showContentFromUrl(url)) {
        e.preventDefault();
        window.history.pushState({ url }, {}, url);
      }
    }
  });

  const isAuthenticated = await auth0.isAuthenticated();

  if (isAuthenticated) {
    console.log("> User is authenticated");
    window.history.replaceState({}, document.title, window.location.pathname);
    updateUI();
    return;
  }

  console.log("> User not authenticated");

  const query = window.location.search;
  const shouldParseResult = query.includes("code=") && query.includes("state=");

  if (shouldParseResult) {
    console.log("> Parsing redirect");
    try {
      const result = await auth0.handleRedirectCallback();

      if (result.appState && result.appState.targetUrl) {
        showContentFromUrl(result.appState.targetUrl);
      }

      console.log("Logged in!");
    } catch (err) {
      console.log("Error parsing redirect:", err);
    }

    window.history.replaceState({}, document.title, "/");
  }

  updateUI();
};
