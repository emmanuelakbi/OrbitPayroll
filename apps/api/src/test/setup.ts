/**
 * Test Setup for OrbitPayroll API
 *
 * This file is loaded before all tests run. It sets up the test environment,
 * configures mocks, and provides utilities for testing.
 */

import { beforeAll, afterAll, vi } from 'vitest';
import { config } from 'dotenv';
import path from 'path';

// Load test environment variables
config({ path: path.resolve(__dirname, '../../.env.test') });

// Set test environment
process.env.NODE_ENV = 'test';

// Ensure JWT_SECRET is set for tests
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-secret-key-for-testing-minimum-32-characters-long';
}

// Mock console methods to reduce noise during tests (optional)
// Uncomment if you want quieter test output
// vi.spyOn(console, 'log').mockImplementation(() => {});
// vi.spyOn(console, 'info').mockImplementation(() => {});

// Global test timeout
vi.setConfig({ testTimeout: 30000 });

beforeAll(async () => {
  // Any global setup can go here
  // For example, database migrations or seeding
});

afterAll(async () => {
  // Any global cleanup can go here
  // For example, closing database connections
});
