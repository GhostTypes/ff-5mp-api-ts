/**
 * Async code testing template
 *
 * Demonstrates patterns for testing promises, async/await, callbacks, and timers
 */

// Async function to test
const fetchData = () => {
  return new Promise((resolve) => {
    setTimeout(() => resolve('peanut butter'), 1000);
  });
};

const fetchReject = () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject('error'), 1000);
  });
};

const fetchUser = () => Promise.resolve({ name: 'Alice', age: 25 });

// Callback-based function
const fetchDataCallback = (callback) => {
  setTimeout(() => callback('peanut butter'), 1000);
};

describe('Async patterns - Promises', () => {
  // Return the promise from test
  test('the data is peanut butter (promise)', () => {
    return fetchData().then((data) => {
      expect(data).toBe('peanut butter');
    });
  });

  // Use .resolves for unwrapped assertions
  test('the data is peanut butter (.resolves)', () => {
    return expect(fetchData()).resolves.toBe('peanut butter');
  });

  // Use .rejects for error cases
  test('the fetch fails with an error', () => {
    return expect(fetchReject()).rejects.toMatch('error');
  });
});

describe('Async patterns - async/await', () => {
  // Use async/await for cleaner tests
  test('the data is peanut butter (async/await)', async () => {
    const data = await fetchData();
    expect(data).toBe('peanut butter');
  });

  test('the fetch fails with an error (async/await)', async () => {
    await expect(fetchReject()).rejects.toMatch('error');
  });

  // Combine with matchers
  test('the user is Alice', async () => {
    const user = await fetchUser();
    expect(user.name).toBe('Alice');
    expect(user.age).toBe(25);
  });
});

describe('Async patterns - Callbacks', () => {
  // Use done callback for callback-based code
  test('the data is peanut butter (callback)', (done) => {
    function callback(data) {
      expect(data).toBe('peanut butter');
      done(); // Call done to signal completion
    }

    fetchDataCallback(callback);
  });
});

describe('Async patterns - Real Timers', () => {
  // Jest waits for async operations by default
  test('async operation completes', async () => {
    const data = await fetchData();
    expect(data).toBe('peanut butter');
  });
});

describe('Async patterns - Timer Mocks', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('fast-forward timers', () => {
    const callback = jest.fn();

    setTimeout(() => {
      callback();
    }, 1000);

    // Fast-forward until all timers have been executed
    jest.runAllTimers();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('advance timers by time', () => {
    const callback = jest.fn();

    setTimeout(() => {
      callback();
    }, 1000);

    // Advance by 1000ms
    jest.advanceTimersByTime(1000);

    expect(callback).toHaveBeenCalledTimes(1);
  });
});
