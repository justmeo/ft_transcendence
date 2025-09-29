// Common schemas for request validation
const schemas = {
  // Health endpoint - no input validation needed
  health: {
    response: {
      200: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          uptime: { type: 'number' },
          version: { type: 'string' },
          timestamp: { type: 'string' },
          database: {
            type: 'object',
            properties: {
              connected: { type: 'boolean' },
              tables: { type: 'number' }
            }
          },
          security: {
            type: 'object',
            properties: {
              https: { type: 'boolean' },
              headers: { type: 'boolean' },
              rateLimit: { type: 'boolean' }
            }
          }
        },
        required: ['ok', 'uptime', 'version', 'timestamp']
      }
    }
  },

  // User registration
  registerUser: {
    body: {
      type: 'object',
      properties: {
        username: { 
          type: 'string', 
          minLength: 3, 
          maxLength: 50,
          pattern: '^[a-zA-Z0-9_-]+$'
        },
        email: { 
          type: 'string', 
          format: 'email',
          maxLength: 100
        },
        password: { 
          type: 'string', 
          minLength: 6, 
          maxLength: 100
        }
      },
      required: ['username', 'email', 'password'],
      additionalProperties: false
    },
    response: {
      201: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          username: { type: 'string' },
          email: { type: 'string' },
          created_at: { type: 'string' }
        }
      },
      400: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' }
        }
      }
    }
  },

  // User login
  loginUser: {
    body: {
      type: 'object',
      properties: {
        username: { type: 'string', minLength: 1 },
        password: { type: 'string', minLength: 1 }
      },
      required: ['username', 'password'],
      additionalProperties: false
    },
    response: {
      200: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              username: { type: 'string' },
              email: { type: 'string' }
            }
          }
        }
      },
      401: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' }
        }
      }
    }
  },

  // Create game
  createGame: {
    body: {
      type: 'object',
      properties: {
        player2_id: { type: 'number', minimum: 1 }
      },
      required: ['player2_id'],
      additionalProperties: false
    },
    response: {
      201: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          player1_id: { type: 'number' },
          player2_id: { type: 'number' },
          status: { type: 'string' },
          created_at: { type: 'string' }
        }
      }
    }
  },

  // Get games list
  getGames: {
    querystring: {
      type: 'object',
      properties: {
        limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
        offset: { type: 'number', minimum: 0, default: 0 },
        status: { type: 'string', enum: ['pending', 'active', 'finished'] }
      },
      additionalProperties: false
    },
    response: {
      200: {
        type: 'object',
        properties: {
          games: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                player1_id: { type: 'number' },
                player2_id: { type: 'number' },
                player1_score: { type: 'number' },
                player2_score: { type: 'number' },
                status: { type: 'string' },
                created_at: { type: 'string' }
              }
            }
          },
          total: { type: 'number' },
          limit: { type: 'number' },
          offset: { type: 'number' }
        }
      }
    }
  },

  // Generic error response
  error: {
    type: 'object',
    properties: {
      error: { type: 'string' },
      message: { type: 'string' },
      statusCode: { type: 'number' }
    },
    required: ['error', 'message', 'statusCode']
  }
};

module.exports = schemas;