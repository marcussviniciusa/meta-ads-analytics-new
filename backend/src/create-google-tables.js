require('dotenv').config();
const { Pool } = require('pg');
const path = require('path');

// Use hardcoded values that are confirmed to work
const pool = new Pool({
  host: '77.37.41.106',
  port: 5432,
  database: 'speedfunnels_v2',
  user: 'postgres',
  password: 'Marcus1911!!Marcus'
});

async function createGoogleTables() {
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // Create google_credentials table
    await client.query(`
      CREATE TABLE IF NOT EXISTS google_credentials (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        expiry_date TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(user_id)
      )
    `);
    
    // Create google_accounts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS google_accounts (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        account_id TEXT NOT NULL,
        display_name TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, account_id)
      )
    `);
    
    // Create google_properties table
    await client.query(`
      CREATE TABLE IF NOT EXISTS google_properties (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        account_id TEXT NOT NULL,
        property_id TEXT NOT NULL,
        display_name TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, property_id)
      )
    `);
    
    // Create google_analytics_data table
    await client.query(`
      CREATE TABLE IF NOT EXISTS google_analytics_data (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        property_id TEXT NOT NULL,
        date TEXT NOT NULL,
        sessions INT NOT NULL DEFAULT 0,
        active_users INT NOT NULL DEFAULT 0,
        new_users INT NOT NULL DEFAULT 0,
        engagement_rate DECIMAL NOT NULL DEFAULT 0,
        conversions INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, property_id, date)
      )
    `);
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log('Google Analytics tables created successfully');
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('Error creating Google Analytics tables:', error);
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

// Run the function
createGoogleTables()
  .then(() => {
    console.log('Google tables creation completed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Failed to create Google tables:', err);
    process.exit(1);
  });
