export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  testMatch: [
    '<rootDir>/server/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/server/**/*.(test|spec).{js,jsx,ts,tsx}',
    '<rootDir>/client/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/client/**/*.(test|spec).{js,jsx,ts,tsx}',
    '<rootDir>/shared/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/shared/**/*.(test|spec).{js,jsx,ts,tsx}',
  ],
  collectCoverageFrom: [
    'server/**/*.{js,jsx,ts,tsx}',
    'client/**/*.{js,jsx,ts,tsx}',
    'shared/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/__tests__/**',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/setupTests.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
