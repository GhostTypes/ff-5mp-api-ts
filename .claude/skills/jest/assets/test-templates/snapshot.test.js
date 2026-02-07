/**
 * Snapshot testing template
 *
 * Demonstrates inline snapshots, external snapshots, and snapshot update patterns
 */

import React from 'react';

// Component to test
const Link = ({ page, children }) => (
  <a className="link" href={page}>
    {children}
  </a>
);

const getComponent = () => <Link page="http://www.facebook.com">Facebook</Link>;

const getConfig = () => ({
  theme: 'dark',
  language: 'en',
  features: ['feature1', 'feature2'],
});

describe('Snapshot testing', () => {
  test('renders component correctly', () => {
    const tree = getComponent();
    expect(tree).toMatchSnapshot();
  });

  test('inline snapshot', () => {
    const config = getConfig();

    // Inline snapshots store the snapshot directly in the code
    expect(config).toMatchInlineSnapshot({
      features: expect.any(Array), // Use matchers for dynamic values
    }, `
    Object {
      "features": Any<Array>,
      "language": "en",
      "theme": "dark",
    }
    `);
  });

  test('snapshot with property matchers', () => {
    const config = getConfig();

    expect(config).toMatchSnapshot({
      features: expect.any(Array), // Match any Array, ignore exact content
    });
  });
});

describe('Snapshot update workflow', () => {
  // 1. Run tests normally: jest
  //    - If snapshot doesn't exist, creates it
  //    - If snapshot exists, compares against it

  // 2. Update snapshots: jest --updateSnapshot (or -u)
  //    - Re-creates all failing snapshots

  // 3. Check for obsolete snapshots: jest --checkSnaps
  //    - Fails if snapshot files are obsolete

  // 4. Interactive snapshot mode: jest --watch
  //    - Press 'i' to enter interactive snapshot mode
  //    - Review each outdated snapshot individually

  test('example snapshot test', () => {
    const data = {
      id: 1,
      name: 'Test User',
      createdAt: new Date(), // This will change every run!
    };

    // Use property matchers for dynamic values
    expect(data).toMatchSnapshot({
      createdAt: expect.any(Date),
    });
  });
});

describe('Snapshot best practices', () => {
  // 1. Keep snapshots focused on UI, not data
  // 2. Use property matchers for dynamic values (dates, ids, etc.)
  // 3. Review snapshots before committing
  // 4. Commit snapshots to version control
  // 5. Don't use snapshots for everything - they're best for regression testing

  test('formatting output', () => {
    const user = {
      name: 'Alice',
      email: 'alice@example.com',
    };

    // Snapshot serialization is pretty-printed for readability
    expect(user).toMatchSnapshot();
  });

  test('avoid snapshots for non-deterministic data', () => {
    // BAD: Don't snapshot random or time-based data
    // expect(Math.random()).toMatchSnapshot();

    // GOOD: Use normal matchers for deterministic checks
    expect(Math.random()).toBeGreaterThanOrEqual(0);
    expect(Math.random()).toBeLessThan(1);
  });
});
