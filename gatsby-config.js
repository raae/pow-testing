/**
 * Configure your Gatsby site with this file.
 *
 * See: https://www.gatsbyjs.org/docs/gatsby-config/
 */

var proxy = require("http-proxy-middleware")

module.exports = {
  /* Your site config here */
  developMiddleware: app => {
    app.use(
      "/.netlify/functions/",
      proxy({
        target: "http://localhost:34567",
        pathRewrite: {
          "/.netlify/functions/": "",
        },
      })
    )
  },
}
