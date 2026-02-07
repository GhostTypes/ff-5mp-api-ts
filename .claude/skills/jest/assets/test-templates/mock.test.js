/**
 * Mock functions testing template
 *
 * Demonstrates mock functions, return values, implementation, and module mocking
 */

// Function that uses a callback
const forEach = (array, callback) => {
  for (let i = 0; i < array.length; i++) {
    callback(array[i]);
  }
};

// Class to mock
class SoundPlayer {
  constructor() {
    this.name = 'Player';
  }

  playSound(fileName) {
    console.log(`Playing ${fileName}`);
  }
}

class SoundPlayerConsumer {
  constructor(soundPlayer) {
    this.soundPlayer = soundPlayer;
  }

  play() {
    this.soundPlayer.playSound('song.mp3');
  }
}

describe('Mock functions', () => {
  test('mock function implementation', () => {
    const mock = jest.fn(x => x + 1);

    expect(mock(1)).toBe(2);
    expect(mock).toHaveBeenCalledWith(1);
  });

  test('mock function with .mock property', () => {
    const mockCallback = jest.fn();

    forEach([0, 1], mockCallback);

    // The mock function is called twice
    expect(mockCallback.mock.calls.length).toBe(2);

    // The first argument of the first call was 0
    expect(mockCallback.mock.calls[0][0]).toBe(0);

    // The first argument of the second call was 1
    expect(mockCallback.mock.calls[1][0]).toBe(1);
  });

  test('mock return values', () => {
    const mock = jest.fn();

    mock.mockReturnValueOnce(10).mockReturnValueOnce('x').mockReturnValue(true);

    expect(mock()).toBe(10);
    expect(mock()).toBe('x');
    expect(mock()).toBe(true);
    expect(mock()).toBe(true);
  });

  test('mock implementation', () => {
    const mock = jest.fn(() => 'default');

    mock.mockImplementation(() => 'first call');
    expect(mock()).toBe('first call');

    mock.mockImplementation(() => 'second call');
    expect(mock()).toBe('second call');

    // Reset to default implementation
    mock.mockReset();
    expect(mock()).toBe('default');
  });
});

describe('Mocking modules', () => {
  // Manual mock in __mocks__ directory:
  // __mocks__/soundPlayer.js:
  // export const playSound = jest.fn(() => 'mocked sound');

  test('using manual mocks', () => {
    // jest.mock('../soundPlayer');
    // const { playSound } = require('../soundPlayer');
    // expect(playSound()).toBe('mocked sound');
  });

  test('mocking part of a module', () => {
    // const { default: axios } = require('axios');
    // jest.mock('axios');
    //
    // const users = [{ name: 'Alice' }];
    // axios.get.mockResolvedValue(users);
    //
    // const result = await fetchUsers();
    // expect(result).toEqual(users);
  });
});

describe('Spying on methods', () => {
  test('spying on implemented methods', () => {
    const audio = new SoundPlayer();
    const playSpy = jest.spyOn(audio, 'playSound');

    playSpy.mockImplementation(() => 'mocked sound');

    expect(audio.playSound('song.mp3')).toBe('mocked sound');

    playSpy.mockRestore();
  });
});

describe('Mock matchers', () => {
  test('mock function matchers', () => {
    const mockFn = jest.fn();

    mockFn('arg1', 'arg2');

    // Basic matchers
    expect(mockFn).toHaveBeenCalled();
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');

    // Partial argument matching
    expect(mockFn).expect(expect.any(String), expect.any(String));

    // Last call
    expect(mockFn).toHaveBeenLastCalledWith('arg1', 'arg2');

    // Snapshot matching
    expect(mockFn.mock.calls).toMatchSnapshot();
  });
});
