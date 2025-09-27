/**
 * Jest setup file for Chrome extension testing
 */

// Mock Chrome APIs
globalThis.chrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    onInstalled: {
      addListener: jest.fn()
    },
    sendMessage: jest.fn(),
    getManifest: jest.fn(() => ({
      version: '1.0.0'
    })),
    lastError: null
  },
  tabs: {
    query: jest.fn(),
    create: jest.fn(),
    sendMessage: jest.fn(),
    onUpdated: {
      addListener: jest.fn()
    }
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn()
    },
    sync: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  identity: {
    getAuthToken: jest.fn(),
    removeCachedAuthToken: jest.fn()
  },
  sidePanel: {
    setPanelBehavior: jest.fn(),
    setOptions: jest.fn()
  }
};

// Mock DOM methods
Object.defineProperty(window, 'location', {
  value: {
    hostname: 'calendar.google.com',
    href: 'https://calendar.google.com'
  }
});

// Mock MutationObserver
globalThis.MutationObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn()
}));

// Mock fetch
globalThis.fetch = jest.fn();

// Mock console methods for cleaner test output
globalThis.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};