import { afterEach, describe, expect, it, jest } from '@jest/globals';
import fs from 'fs';

import { ThreadStorage } from './threadStorage';

// Mock fs module
jest.mock('fs');

describe('Thread Storage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should load threads from file', async () => {
    const mockData = '{"test": "test"}';
    (
      fs.existsSync as jest.MockedFunction<typeof fs.existsSync>
    ).mockReturnValue(true);
    (
      fs.readFileSync as jest.MockedFunction<typeof fs.readFileSync>
    ).mockReturnValue(mockData);

    const threadStorage = new ThreadStorage();

    expect(fs.readFileSync).toHaveBeenCalledWith(
      expect.stringContaining('user-threads.json'),
      'utf8',
    );
    expect(threadStorage.getAll()).toEqual({ test: 'test' });
  });

  it('should save threads to a file', async () => {
    (
      fs.existsSync as jest.MockedFunction<typeof fs.existsSync>
    ).mockReturnValue(false);
    (
      fs.writeFileSync as jest.MockedFunction<typeof fs.writeFileSync>
    ).mockReturnValue(undefined);
    const threadStorage = new ThreadStorage();

    threadStorage.set('test', 'test');

    expect(fs.writeFileSync).toHaveBeenLastCalledWith(
      expect.stringContaining('user-threads.json'),
      expect.stringContaining('"test": "test"'),
    );
  });

  it('should return all threads', async () => {
    const threadStorage = new ThreadStorage();
    threadStorage.set('test1', 'test');
    threadStorage.set('test2', 'test');
    threadStorage.set('test3', 'test');

    expect(threadStorage.getAll()).toEqual({
      test1: 'test',
      test2: 'test',
      test3: 'test',
    });
  });

  it('should clear all threads', async () => {
    const threadStorage = new ThreadStorage();
    threadStorage.set('test1', 'test');
    threadStorage.set('test2', 'test');
    threadStorage.set('test3', 'test');

    threadStorage.clear();
    expect(threadStorage.getAll()).toEqual({});
  });

  it('should delete a thread by user id', async () => {
    const threadStorage = new ThreadStorage();
    threadStorage.set('test1', 'test');
    threadStorage.set('test2', 'test');
    threadStorage.set('test3', 'test');

    threadStorage.delete('test2');
    expect(threadStorage.getAll()).toEqual({ test1: 'test', test3: 'test' });
  });

  it('should return the number of saved threads', async () => {
    const threadStorage = new ThreadStorage();
    threadStorage.set('test1', 'test');
    threadStorage.set('test2', 'test');
    threadStorage.set('test3', 'test');

    expect(threadStorage.size()).toBe(3);
  });
});
