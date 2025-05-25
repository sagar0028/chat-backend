exports.up = function(knex) {
  return knex.schema.table('users', table => {
    table.text('about').nullable();
    table.date('dob').nullable();
    table.string('avatar').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.table('users', table => {
    table.dropColumn('about');
    table.dropColumn('dob');
    table.dropColumn('avatar');
  });
}; 