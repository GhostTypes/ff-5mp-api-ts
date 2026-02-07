/**
 * Jest configuration for TypeScript projects
 *
 * Requires: ts-jest preset
 * Install: npm install --save-dev ts-jest @types/jest
 */

import type { Config } from 'jest';

const config: Config = {
  // Automatically clear mock calls, mocks, and instances between tests
  clearMocks: true,

  // Indicates whether the coverage information should be collected while executing tests
  collectCoverage: false,

  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
  ],

  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',

  // The test environment that will be used for testing
  testEnvironment: 'node',

  // The glob patterns Jest uses to detect test files
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ],

  // Use ts-jest for TypeScript files
  preset: 'ts-jest',

  // Additional options (uncomment as needed):
  // verbose: true,
  // testURL: 'http://localhost',
  // setupFiles: [],
  // setupFilesAfterEnv: [],
};

export default config;
