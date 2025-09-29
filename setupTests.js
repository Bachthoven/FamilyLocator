// Global test setup for the main project

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

// Silence console logs during tests unless needed
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
