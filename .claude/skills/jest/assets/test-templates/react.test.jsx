/**
 * React testing template
 *
 * Demonstrates React component testing with @testing-library/react
 *
 * Setup:
 * 1. npm install --save-dev @testing-library/react @testing-library/jest-dom jest-environment-jsdom
 * 2. Create src/setupTests.js: import '@testing-library/jest-dom';
 * 3. Configure jest.config.js: testEnvironment: 'jsdom'
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Example components to test

const Button = ({ onClick, children }) => (
  <button onClick={onClick}>{children}</button>
);

const Counter = () => {
  const [count, setCount] = React.useState(0);

  return (
    <div>
      <span data-testid="count">{count}</span>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={() => setCount(count - 1)}>Decrement</button>
    </div>
  );
};

const LoginForm = ({ onSubmit }) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ email, password });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        data-testid="email-input"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        data-testid="password-input"
      />
      <button type="submit">Submit</button>
    </form>
  );
};

const FetchUser = ({ userId }) => {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    setLoading(true);
    fetch(`/api/users/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        setUser(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!user) return null;

  return <div>{user.name}</div>;
};

describe('React component testing', () => {
  describe('Basic rendering', () => {
    test('renders button with text', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    test('renders counter with initial state', () => {
      render(<Counter />);
      expect(screen.getByTestId('count')).toHaveTextContent('0');
    });
  });

  describe('User interactions', () => {
    test('increments counter', () => {
      render(<Counter />);

      const button = screen.getByText('Increment');
      fireEvent.click(button);

      expect(screen.getByTestId('count')).toHaveTextContent('1');
    });

    test('decrements counter', () => {
      render(<Counter />);

      const button = screen.getByText('Decrement');
      fireEvent.click(button);

      expect(screen.getByTestId('count')).toHaveTextContent('-1');
    });
  });

  describe('Form handling', () => {
    test('submits form with email and password', () => {
      const handleSubmit = jest.fn();

      render(<LoginForm onSubmit={handleSubmit} />);

      fireEvent.change(screen.getByTestId('email-input'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByTestId('password-input'), {
        target: { value: 'password123' },
      });
      fireEvent.click(screen.getByText('Submit'));

      expect(handleSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  describe('Async operations', () => {
    test('fetches and displays user', async () => {
      // Mock fetch
      global.fetch = jest.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({ name: 'Alice' }),
        })
      );

      render(<FetchUser userId={1} />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
      });

      global.fetch.mockRestore();
    });
  });

  describe('Testing Library queries', () => {
    test('different query methods', () => {
      render(<Button>Click me</Button>);

      // getByText - throws if not found (use for expected elements)
      expect(screen.getByText('Click me')).toBeInTheDocument();

      // queryByText - returns null if not found (use for optional elements)
      expect(screen.queryByText('Not Found')).toBeNull();

      // findByText - async, waits for element (use for delayed elements)
      // await screen.findByText('Delayed Text');
    });

    test('using test ids', () => {
      render(<Counter />);
      expect(screen.getByTestId('count')).toBeInTheDocument();
    });
  });

  describe('Snapshot testing', () => {
    test('matches snapshot', () => {
      const { container } = render(<Button>Click me</Button>);
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
