/**
 * Jest configuration with Babel support
 *
 * Requires: @babel/preset-env
 * Install: npm install --save-dev @babel/preset-env @babel/core @babel/jest
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

  // Transform files with Babel
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },

  // Additional options (uncomment as needed):
  // verbose: true,
  // testURL: 'http://localhost',
  // setupFiles: [],
  // setupFilesAfterEnv: [],
};

// babel.config.js example:
// module.exports = {
//   presets: [
//     ['@babel/preset-env', { targets: { node: 'current' } }],
//   ],
// };
