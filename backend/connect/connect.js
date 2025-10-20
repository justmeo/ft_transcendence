const knex = require("knex");

const connectDB = (dbName) => {
  const knexInstance = knex({
    client: "sqlite3",
    connection: {
      filename: `./db/${dbName}.sqlite3`,
    },
    useNullAsDefault: true, // Required for SQLite
    pool: {
      afterCreate: (conn, cb) => {
        conn.run("PRAGMA foreign_keys = ON", cb); // Ensables foreign key constraints
      },
    },
  });
  return knexInstance;
};

module.exports = connectDB;