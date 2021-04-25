const express = require("express");
const { join } = require("path");
const morgan = require("morgan");
const helmet = require("helmet");
const app = express();
const jwt = require("express-jwt");
const jwtAuthz = require('express-jwt-authz');
const jwksRsa = require("jwks-rsa");
const authConfig = require("./auth_config.json");
var ManagementClient = require('auth0').ManagementClient;

var auth0Management = new ManagementClient({
  domain: 'jithesh.au.auth0.com',
  clientId: 'VwhUVSIruKQGXrfniPVUKjpUwttj9Alf',
  clientSecret: 'XZihGQGpeKd2wMVTje8xcpflh1S6STgJZ3wB_s0W18popWobgpmZOwzpFdy7e6HU'
});

app.use(express.urlencoded());
app.use(express.json());
app.use(morgan("dev"));
app.use(helmet());
app.use(express.static(join(__dirname, "public")));

// create the JWT middleware
const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${authConfig.domain}/.well-known/jwks.json`
  }),

  audience: authConfig.audience,
  issuer: `https://${authConfig.domain}/`,
  algorithms: ["RS256"]
});

const checkScopesForOrder = jwtAuthz([ 'create:orders' ]);

app.get("/auth_config.json", (req, res) => {
  res.sendFile(join(__dirname, "auth_config.json"));
});

app.post("/api/orders", checkJwt, checkScopesForOrder, (req, res) => {
  console.log(req.user);
  auth0Management.getUser({id: req.user.sub}, function(err, userData) {
    if (err) {
      // handle error.
      console.log("Error", err);
    }
    var appMetadata = userData.app_metadata;
    console.log("Current app metadata:", appMetadata);
    console.log("New order", req.body);
    if(!appMetadata)
      appMetadata = {};
    if(!appMetadata.orders)
      appMetadata.orders = [];
    appMetadata.orders.push({
      created_at: Date.now(),
      items: req.body
    });
    auth0Management.updateAppMetadata({id: req.user.sub}, appMetadata, function (err, user) {
      if (err) {
        console.log("Error", err);
      }
      // Updated user.
      console.log(user);
      res.send("Order created")
    });
  });
});

app.get("/", (_, res) => {
  res.sendFile(join(__dirname, "index1.html"));
});

process.on("SIGINT", function() {
  process.exit();
});

module.exports = app;
