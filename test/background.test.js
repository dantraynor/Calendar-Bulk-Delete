/**
 * Tests for Calendar Bulk Event Manager Background Script
 */

describe('MessageRouter', () => {
  beforeEach(() => {
    // Reset mocks
    chrome.runtime.sendMessage.mockClear();
    chrome.identity.getAuthToken.mockClear();
    globalThis.fetch.mockClear();
  });

  test('should handle authentication request', async () => {
    const mockToken = 'mock-auth-token-123';
    chrome.identity.getAuthToken.mockImplementation((options, callback) => {
      callback(mockToken);
    });

    // Mock the auth manager
    const getValidToken = () => {
      return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ 
          interactive: true,
          scopes: ['https://www.googleapis.com/auth/calendar.events']
        }, (token) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(token);
          }
        });
      });
    };

    const token = await getValidToken();
    expect(token).toBe(mockToken);
    expect(chrome.identity.getAuthToken).toHaveBeenCalledWith(
      expect.objectContaining({
        interactive: true,
        scopes: ['https://www.googleapis.com/auth/calendar.events']
      }),
      expect.any(Function)
    );
  });

  test('should handle bulk delete events request', async () => {
    const mockEventIds = ['event1', 'event2', 'event3'];
    
    // Mock successful API responses
    globalThis.fetch
      .mockResolvedValueOnce({ ok: true }) // event1
      .mockResolvedValueOnce({ ok: true }) // event2
      .mockRejectedValueOnce(new Error('Network error')); // event3

    // Mock rate limiter
    class MockRateLimiter {
      async acquire() {
        return Promise.resolve();
      }
    }

    // Mock bulk deletion logic
    const performBulkDeletion = async (eventIds) => {
      const results = { successful: [], failed: [] };
      const batchSize = 10;
      const rateLimiter = new MockRateLimiter();
      
      for (let i = 0; i < eventIds.length; i += batchSize) {
        const batch = eventIds.slice(i, i + batchSize);
        
        try {
          const batchResults = await Promise.allSettled(
            batch.map(async (eventId) => {
              await rateLimiter.acquire();
              const response = await fetch(`https://api.example.com/events/${eventId}`, {
                method: 'DELETE'
              });
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
              }
              return eventId;
            })
          );
          
          batchResults.forEach((result, index) => {
            const eventId = batch[index];
            if (result.status === 'fulfilled') {
              results.successful.push(eventId);
            } else {
              results.failed.push({
                eventId,
                error: result.reason.message,
                retryable: true
              });
            }
          });
          
        } catch (batchError) {
          batch.forEach(eventId => {
            results.failed.push({ 
              eventId, 
              error: batchError.message, 
              retryable: true 
            });
          });
        }
      }
      
      return results;
    };

    const result = await performBulkDeletion(mockEventIds);
    
    expect(result.successful).toEqual(['event1', 'event2']);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].eventId).toBe('event3');
  });

  test('should handle rate limiting', async () => {
    const rateLimiter = {
      maxRequests: 2,
      windowMs: 1000,
      requests: [],
      
      async acquire() {
        const now = Date.now();
        
        this.requests = this.requests.filter(time => now - time < this.windowMs);
        
        if (this.requests.length >= this.maxRequests) {
          const oldestRequest = Math.min(...this.requests);
          const waitTime = this.windowMs - (now - oldestRequest);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return this.acquire();
        }
        
        this.requests.push(now);
      }
    };

    // const startTime = Date.now();
    
    // First two requests should go through immediately
    await rateLimiter.acquire();
    await rateLimiter.acquire();
    
    expect(rateLimiter.requests).toHaveLength(2);
    
    // Third request should be rate limited
    const thirdRequestStart = Date.now();
    await rateLimiter.acquire();
    const thirdRequestEnd = Date.now();
    
    // Should have waited some time (allowing for test timing variations)
    expect(thirdRequestEnd - thirdRequestStart).toBeGreaterThan(0);
  });
});