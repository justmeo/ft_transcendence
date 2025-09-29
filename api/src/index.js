const fastify = require('fastify')({
  logger: true
});

// Register CORS
fastify.register(require('@fastify/cors'), {
  origin: true
});

// Health check endpoint
fastify.get('/api/health', async (request, reply) => {
  return { ok: true };
});

// Root API endpoint
fastify.get('/api', async (request, reply) => {
  return { message: 'ft_transcendence API', version: '1.0.0' };
});

// Start server
const start = async () => {
  try {
    const host = process.env.API_HOST || '0.0.0.0';
    const port = process.env.API_PORT || 3000;
    
    await fastify.listen({ port: port, host: host });
    console.log(`API server listening on ${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();