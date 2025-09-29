const helmet = require('@fastify/helmet');
const rateLimit = require('@fastify/rate-limit');
const config = require('./config');

async function securityPlugin(fastify, options) {
  // HTTPS enforcement middleware (temporarily disabled for debugging)
  if (config.forceHttps && config.isProduction) {
    fastify.addHook('onRequest', async (request, reply) => {
      // Check X-Forwarded-Proto header (set by nginx)
      const proto = request.headers['x-forwarded-proto'];
      
      if (proto && proto !== 'https') {
        const httpsUrl = `https://${request.headers.host}${request.url}`;
        reply.code(301).redirect(httpsUrl);
        return;
      }
    });
  }

  // Register Helmet for security headers
  await fastify.register(helmet, {
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:", "ws:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    },
    
    // Cross Origin Embedder Policy
    crossOriginEmbedderPolicy: false, // Disable if needed for development
    
    // DNS Prefetch Control
    dnsPrefetchControl: { allow: false },
    
    // Frame Options
    frameguard: { action: 'deny' },
    
    // Hide Powered-By Header
    hidePoweredBy: true,
    
    // HSTS
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    
    // IE No Open
    ieNoOpen: true,
    
    // Don't Sniff Mimetype
    noSniff: true,
    
    // Origin Agent Cluster
    originAgentCluster: true,
    
    // Permitted Cross Domain Policies
    permittedCrossDomainPolicies: false,
    
    // Referrer Policy
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    
    // XSS Filter
    xssFilter: true
  });

  // Global rate limiter
  await fastify.register(rateLimit, {
    max: config.rateLimit.global.max,
    timeWindow: config.rateLimit.global.timeWindow,
    errorResponseBuilder: function (request, context) {
      return {
        error: 'TooManyRequests',
        message: `Rate limit exceeded, retry in ${Math.round(context.ttl / 1000)} seconds`,
        statusCode: 429,
        retryAfter: Math.round(context.ttl / 1000)
      };
    }
  });

  // Auth-specific rate limiter (more restrictive)
  const authRateLimiter = {
    max: config.rateLimit.auth.max,
    timeWindow: config.rateLimit.auth.timeWindow,
    keyGenerator: function (request) {
      // Use IP + endpoint for rate limiting key
      return `${request.ip}:${request.routerPath}`;
    },
    errorResponseBuilder: function (request, context) {
      return {
        error: 'TooManyRequests',
        message: `Too many authentication attempts, retry in ${Math.round(context.ttl / 1000)} seconds`,
        statusCode: 429,
        retryAfter: Math.round(context.ttl / 1000)
      };
    },
    skipOnError: false
  };

  // Make auth rate limiter available to routes
  fastify.decorate('authRateLimit', authRateLimiter);

  // IP-based security middleware
  fastify.addHook('onRequest', async (request, reply) => {
    // Log security-relevant information
    fastify.log.debug({
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      path: request.url,
      method: request.method
    }, 'Security audit log');

    // Block requests without proper headers in production
    if (config.isProduction) {
      const userAgent = request.headers['user-agent'];
      if (!userAgent || userAgent.length < 3) {
        reply.code(400).send({
          error: 'BadRequest',
          message: 'Invalid request headers',
          statusCode: 400
        });
        return;
      }
    }
  });

  // WebSocket security preparation (relaxed for development)
  fastify.addHook('onRequest', async (request, reply) => {
    // Ensure WebSocket upgrades use secure protocols in production only
    if (request.headers.upgrade === 'websocket' && config.isProduction) {
      const proto = request.headers['x-forwarded-proto'];
      if (config.forceHttps && proto !== 'https') {
        reply.code(400).send({
          error: 'BadRequest',
          message: 'WebSocket connections must use secure protocol (wss://)',
          statusCode: 400
        });
        return;
      }
    }
  });
}

module.exports = securityPlugin;