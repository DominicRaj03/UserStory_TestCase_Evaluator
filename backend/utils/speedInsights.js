const { injectSpeedInsights } = require('@vercel/speed-insights');

/**
 * Speed Insights configuration for Vercel deployment
 * This module provides utilities to integrate Vercel Speed Insights
 * into HTML responses for client-side performance monitoring.
 */

/**
 * Get the Speed Insights script tag for manual injection into HTML
 * @param {Object} options - Speed Insights options
 * @param {boolean} options.debug - Enable debug logging (default: false in production)
 * @param {number} options.sampleRate - Sample rate for events (0-1, default: 1)
 * @param {string} options.route - Route name for the page
 * @returns {string} HTML script tag for Speed Insights
 */
function getSpeedInsightsScript(options = {}) {
  const { 
    debug = process.env.NODE_ENV !== 'production',
    sampleRate = 1,
    route = null
  } = options;

  // Speed Insights works client-side, so we need to inject the script
  // The actual tracking is handled by the @vercel/speed-insights package in the browser
  return `
<script>
  window.si=window.si||function(){(window.siq=window.siq||[]).push(arguments);};
</script>
<script defer src="/_vercel/speed-insights/script.js"></script>
  `.trim();
}

/**
 * Middleware to inject Speed Insights into HTML responses
 * This middleware intercepts HTML responses and injects the Speed Insights script
 * before sending them to the client.
 * 
 * @param {Object} options - Speed Insights configuration options
 * @returns {Function} Express middleware function
 */
function speedInsightsMiddleware(options = {}) {
  return (req, res, next) => {
    // Store the original send function
    const originalSend = res.send;

    // Override the send function
    res.send = function(data) {
      // Only inject into HTML responses
      const contentType = res.get('Content-Type');
      if (contentType && contentType.includes('text/html') && typeof data === 'string') {
        // Check if HTML contains a closing </head> or </body> tag
        if (data.includes('</head>') || data.includes('</body>')) {
          const script = getSpeedInsightsScript(options);
          
          // Try to inject before </head> first, fallback to </body>
          if (data.includes('</head>')) {
            data = data.replace('</head>', `${script}\n</head>`);
          } else if (data.includes('</body>')) {
            data = data.replace('</body>', `${script}\n</body>`);
          }
        }
      }

      // Call the original send function with modified data
      originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Manually inject Speed Insights script into HTML string
 * @param {string} html - HTML string to inject the script into
 * @param {Object} options - Speed Insights options
 * @returns {string} Modified HTML with Speed Insights script
 */
function injectSpeedInsightsIntoHtml(html, options = {}) {
  const script = getSpeedInsightsScript(options);
  
  // Try to inject before </head> first, fallback to </body>
  if (html.includes('</head>')) {
    return html.replace('</head>', `${script}\n</head>`);
  } else if (html.includes('</body>')) {
    return html.replace('</body>', `${script}\n</body>`);
  }
  
  // If no closing tags found, append to the end
  return html + script;
}

module.exports = {
  getSpeedInsightsScript,
  speedInsightsMiddleware,
  injectSpeedInsightsIntoHtml
};
