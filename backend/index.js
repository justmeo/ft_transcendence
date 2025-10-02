//Defines a Fastify server and connects to SQLite.
const fastify = require('fastify')({ logger: true });
const sqlite3 = require('sqlite3').verbose();

// SQLite DB setup
const db = new sqlite3.Database('./db/database.db'); // Make sure db/database.db exists in backend folder
