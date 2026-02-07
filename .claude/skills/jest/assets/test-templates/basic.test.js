/**
 * Basic Jest test template
 *
 * Demonstrates core testing patterns: basic assertions, describe blocks, and matchers
 */

// Function to test
const sum = (a, b) => a + b;
const multiply = (a, b) => a * b;

describe('Math operations', () => {
  // Basic test with matchers
  test('adds 1 + 2 to equal 3', () => {
    expect(sum(1, 2)).toBe(3);
  });

  test('multiplies 3 * 4 to equal 12', () => {
    expect(multiply(3, 4)).toBe(12);
  });

  // Grouping related tests
  describe('sum function', () => {
    test('handles positive numbers', () => {
      expect(sum(1, 2)).toBe(3);
    });

    test('handles negative numbers', () => {
      expect(sum(-1, -2)).toBe(-3);
    });

    test('handles zero', () => {
      expect(sum(0, 5)).toBe(5);
    });
  });
});

describe('Common matchers', () => {
  test('exact equality with toBe', () => {
    expect(2 + 2).toBe(4);
  });

  test('deep equality with toEqual', () => {
    const obj = { one: 1, two: 2 };
    expect(obj).toEqual({ one: 1, two: 2 });
  });

  test('truthiness', () => {
    const n = null;
    expect(n).toBeNull();
    expect(n).toBeDefined();
    expect(n).not.toBeUndefined();
    expect(n).not.toBeTruthy();
    expect(n).toBeFalsy();
  });

  test('numbers', () => {
    const value = 2 + 2;
    expect(value).toBeGreaterThan(3);
    expect(value).toBeGreaterThanOrEqual(3.5);
    expect(value).toBeLessThan(5);
    expect(value).toBeLessThanOrEqual(4.5);

    // toBe and toEqual are equivalent for numbers
    expect(value).toBe(4);
    expect(value).toEqual(4);
  });

  test('strings', () => {
    expect('Christoph').toMatch(/stop/);
  });

  test('arrays', () => {
    const shoppingList = [
      'diapers',
      'kleenex',
      'trash bags',
      'paper towels',
      'milk',
    ];
    expect(shoppingList).toContain('milk');
    expect(new Set(shoppingList)).toContain('milk');
  });

  // Combining matchers with 'not'
  test('negated matchers', () => {
    expect(2 + 2).not.toBe(5);
    expect('hello').not.toMatch(/world/);
  });
});
