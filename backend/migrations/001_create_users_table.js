/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('users', function(table) {
    table.increments('id').primary();
    table.string('username').unique().notNullable()
            .checkLength(">=", 3)
            .checkLength("<=", 50);;
    table.string('email').unique().notNullable();
    table.string('password_hash')
        .nullable()
        .checkLength(">=", 5);
    table.boolean('twofa_enabled').defaultTo(false);
    table.string('twofa_secret').nullable();
    table.string('google_id').unique().nullable();
    table.string('avatar_url').nullable();
    table.timestamps(true, true); // created_at and updated_at with default values
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('users');
};
