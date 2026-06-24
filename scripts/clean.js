const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function clean() {
  await sql`TRUNCATE TABLE transfers, data_rows, users, organizations CASCADE;`;
  console.log("Database wiped clean");
}

clean().catch(console.error);
