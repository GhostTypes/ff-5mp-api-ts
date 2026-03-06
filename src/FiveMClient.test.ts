/**
 * @fileoverview Constructor and endpoint tests for FiveMClient connection port overrides.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FiveMClient } from './FiveMClient';

const { flashForgeClientConstructor, axiosCreate } = vi.hoisted(() => ({
  flashForgeClientConstructor: vi.fn(),
  axiosCreate: vi.fn(),
}));

vi.mock('./tcpapi/FlashForgeClient', () => ({
  FlashForgeClient: flashForgeClientConstructor,
}));

vi.mock('axios', () => ({
  default: {
    create: axiosCreate,
  },
}));

describe('FiveMClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    flashForgeClientConstructor.mockImplementation(function mockFlashForgeClient() {
      return {
        initControl: vi.fn().mockResolvedValue(true),
        dispose: vi.fn().mockResolvedValue(undefined),
        getPrinterInfo: vi.fn().mockResolvedValue(null),
      };
    });
    axiosCreate.mockReturnValue({
      post: vi.fn(),
    });
  });

  it('uses default HTTP and TCP ports when no overrides are provided', () => {
    const client = new FiveMClient('192.168.1.10', 'SN-1', 'CHK-1');

    expect(client.getEndpoint('/detail')).toBe('http://192.168.1.10:8898/detail');
    expect(flashForgeClientConstructor).toHaveBeenCalledWith('192.168.1.10', undefined);
  });

  it('uses custom HTTP and TCP ports when overrides are provided', () => {
    const client = new FiveMClient('192.168.1.10', 'SN-1', 'CHK-1', {
      httpPort: 19098,
      tcpPort: 19099,
    });

    expect(client.getEndpoint('/detail')).toBe('http://192.168.1.10:19098/detail');
    expect(flashForgeClientConstructor).toHaveBeenCalledWith('192.168.1.10', { port: 19099 });
  });
});
