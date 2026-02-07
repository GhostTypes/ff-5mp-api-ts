/**
 * Jest configuration for React projects
 *
 * Requires: @testing-library/react
 * Install: npm install --save-dev @testing-library/react @testing-library/jest-dom jest-environment-jsdom
 */

module.exports = {
  // Automatically clear mock calls, mocks, and instances between tests
  clearMocks: true,

  // Indicates whether the coverage information should be collected while executing tests
  collectCoverage: false,

  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}',
  ],

  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',

  // Use jsdom environment for React testing
  testEnvironment: 'jsdom',

  // The glob patterns Jest uses to detect test files
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ],

  // Setup files for React Testing Library
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],

  // Module paths and name mappings
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },

  // Transform files with Babel
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },

  // Additional options (uncomment as needed):
  // verbose: true,
  // preset: undefined,
  // setupFiles: [],
};

// src/setupTests.js example:
// import '@testing-library/jest-dom';
