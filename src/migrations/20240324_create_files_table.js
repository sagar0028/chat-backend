exports.up = function(knex) {
  return knex.schema.createTable('files', table => {
    table.increments('id').primary();
    table.string('original_name').notNullable();
    table.string('file_name').notNullable().unique();
    table.string('file_path').notNullable();
    table.string('mime_type').notNullable();
    table.integer('size').notNullable();
    table.string('hash').notNullable();
    table.integer('uploaded_by').references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    // Indexes
    table.index('uploaded_by');
    table.index('created_at');
    table.index('mime_type');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('files');
}; 