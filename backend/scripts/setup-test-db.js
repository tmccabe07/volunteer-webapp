#!/usr/bin/env node
/**
 * Test Database Setup Script
 * This script creates and initializes the test database for running tests
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, description) {
  log(description, 'yellow');
  try {
    execSync(command, { stdio: 'inherit', cwd: __dirname + '/..' });
  } catch (error) {
    log(`Error: ${error.message}`, 'yellow');
    process.exit(1);
  }
}

log('Setting up test database...', 'cyan');

// Set test database environment variable
process.env.DATABASE_URL = 'file:./test.db';

// Remove old test database if it exists
const testDbPath = path.join(__dirname, '..', 'test.db');
if (fs.existsSync(testDbPath)) {
  log('Removing old test database...', 'yellow');
  fs.unlinkSync(testDbPath);
}

// Generate Prisma client
exec('npx prisma generate', 'Generating Prisma client...');

// Run migrations on test database
exec('npx prisma migrate deploy', 'Running migrations on test database...');

log('Test database setup complete!', 'green');
log('');
log('You can now run tests with:', 'cyan');
log('  npm test', 'white');
log('  npm run test:cov', 'white');
log('  npm run test:e2e', 'white');
