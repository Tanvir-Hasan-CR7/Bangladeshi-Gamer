import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function testConnection() {
  const host = process.env.MYSQL_HOST;
  const port = Number(process.env.MYSQL_PORT || 3306);
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD || '';
  const database = process.env.MYSQL_DATABASE;

  if (!host || !user || !database) {
    console.log('MySQL connection failed: Missing MYSQL_HOST, MYSQL_USER, or MYSQL_DATABASE environment variables.');
    process.exit(1);
  }

  try {
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      connectTimeout: 5000,
    });

    await connection.execute('SELECT 1');
    await connection.end();
    console.log('MySQL connection successful');
    process.exit(0);
  } catch (err: any) {
    console.log(`MySQL connection failed: ${err.message || 'Unknown connection error'}`);
    process.exit(1);
  }
}

testConnection();
