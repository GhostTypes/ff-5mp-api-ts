/**
 * Setup and teardown template
 *
 * Demonstrates beforeEach, afterEach, beforeAll, afterAll, and scoping
 */

// Database-like example
class Database {
  constructor() {
    this.data = [];
  }

  insert(record) {
    this.data.push(record);
  }

  getAll() {
    return [...this.data];
  }

  clear() {
    this.data = [];
  }

  connect() {
    console.log('Database connected');
  }

  disconnect() {
    console.log('Database disconnected');
  }
}

describe('Setup and teardown', () => {
  let db;

  // Runs once before all tests in this describe block
  beforeAll(() => {
    db = new Database();
    db.connect();
  });

  // Runs once after all tests complete
  afterAll(() => {
    db.disconnect();
  });

  // Runs before each test
  beforeEach(() => {
    db.clear();
  });

  // Runs after each test
  afterEach(() => {
    // Cleanup if needed
  });

  test('insert and retrieve records', () => {
    db.insert({ id: 1, name: 'Alice' });
    db.insert({ id: 2, name: 'Bob' });

    const records = db.getAll();
    expect(records).toHaveLength(2);
    expect(records[0].name).toBe('Alice');
  });

  test('empty database returns empty array', () => {
    const records = db.getAll();
    expect(records).toHaveLength(0);
  });

  test('clear removes all records', () => {
    db.insert({ id: 1, name: 'Alice' });
    expect(db.getAll()).toHaveLength(1);

    db.clear();
    expect(db.getAll()).toHaveLength(0);
  });
});

describe('Setup/teardown scoping', () => {
  let outerValue;

  beforeAll(() => {
    outerValue = 'outer';
  });

  describe('nested describe block', () => {
    let innerValue;

    beforeAll(() => {
      innerValue = 'inner';
    });

    test('has access to outer and inner setup', () => {
      expect(outerValue).toBe('outer');
      expect(innerValue).toBe('inner');
    });
  });

  test('only has access to outer setup', () => {
    expect(outerValue).toBe('outer');
    expect(innerValue).toBeUndefined(); // innerValue is not defined here
  });
});

describe('General order of execution', () => {
  beforeAll(() => console.log('1 - beforeAll'));
  afterAll(() => console.log('1 - afterAll'));
  beforeEach(() => console.log('1 - beforeEach'));
  afterEach(() => console.log('1 - afterEach'));

  test('', () => console.log('1 - test'));

  describe('Scoped', () => {
    beforeAll(() => console.log('2 - beforeAll'));
    afterAll(() => console.log('2 - afterAll'));
    beforeEach(() => console.log('2 - beforeEach'));
    afterEach(() => console.log('2 - afterEach'));

    test('', () => console.log('2 - test'));
  });

  // Execution order:
  // 1 - beforeAll
  // 1 - beforeEach
  // 1 - test
  // 1 - afterEach
  // 2 - beforeAll
  // 1 - beforeEach
  // 2 - beforeEach
  // 2 - test
  // 2 - afterEach
  // 1 - afterEach
  // 2 - afterAll
  // 1 - afterAll
});

describe('Real-world example: API client', () => {
  let apiClient;
  let authToken;

  beforeAll(async () => {
    // Setup that runs once
    apiClient = new APIClient();
    authToken = await apiClient.login('test-user', 'test-password');
  });

  afterAll(async () => {
    // Cleanup that runs once
    await apiClient.logout();
    apiClient.close();
  });

  beforeEach(() => {
    // Reset state before each test
    apiClient.setAuthToken(authToken);
  });

  test('fetches user data', async () => {
    const user = await apiClient.getUser(1);
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('name');
  });

  test('creates new user', async () => {
    const newUser = await apiClient.createUser({
      name: 'Test User',
      email: 'test@example.com',
    });
    expect(newUser.id).toBeDefined();
  });
});
