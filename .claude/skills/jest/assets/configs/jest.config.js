/**
 * Basic Jest configuration for JavaScript projects
 *
 * Run `npx jest --init` to generate this interactively, or customize these options.
 * See https://jestjs.io/docs/configuration for all options.
 */

module.exports = {
  // Automatically clear mock calls, mocks, and instances between tests
  clearMocks: true,

  // Indicates whether the coverage information should be collected while executing tests
  collectCoverage: false,

  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.test.{js,jsx}',
    '!src/**/*.spec.{js,jsx}',
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

  // A map from regular expressions to paths to transformers
  transform: {},

  // Additional options (uncomment as needed):
  // verbose: true,
  // testURL: 'http://localhost',
  // preset: undefined,
  // setupFiles: [],
  // setupFilesAfterEnv: [],
};
