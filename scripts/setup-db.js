#!/usr/bin/env node

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Pool } = pg;

async function setupDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    
    // Read schema file
    const schemaPath = join(__dirname, '..', 'sql', 'schema.sql');
    const schema = await readFile(schemaPath, 'utf8');
    
    console.log('Creating tables...');
    await pool.query(schema);
    
    console.log('✅ Database setup completed successfully!');
    console.log('\nTables created:');
    console.log('  - users');
    console.log('  - reports');
    console.log('\nIndexes created for optimal performance.');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();
