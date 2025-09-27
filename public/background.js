/**
 * Calendar Bulk Delete - Background Service Worker
 * Handles API calls, authentication, and bulk operations
 */

class MessageRouter {
  constructor() {
    this.authManager = new AuthManager();
    this.init();
  }

  init() {
    chrome.runtime.onMessage.addListener(
      (request, sender, sendResponse) => {
        this.handleMessage(request, sender, sendResponse);
        return true; // Keep channel open for async response
      }
    );

    // Handle extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        this.onFirstInstall();
      }
    });
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      // eslint-disable-next-line no-console
      console.log('Background script received message:', request.action, request);
      switch (request.action) {
        case 'BULK_DELETE_EVENTS': {
          // eslint-disable-next-line no-console
          console.log('Starting bulk deletion for', request.events?.length, 'events');
          const result = await this.performBulkDeletion(request.events);
          // eslint-disable-next-line no-console
          console.log('Bulk deletion result:', result);
          sendResponse({ success: true, result });
          break;
        }
          
        case 'GET_AUTH_TOKEN': {
          const token = await this.authManager.getValidToken();
          sendResponse({ success: true, token });
          break;
        }
          
        case 'REVOKE_AUTH': {
          await this.authManager.revokeToken();
          sendResponse({ success: true });
          break;
        }
          
        case 'GET_CALENDAR_EVENTS': {
          const events = await this.getCalendarEvents(request.calendarId, request.filters);
          sendResponse({ success: true, events });
          break;
        }
          
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      // Log error for debugging (can be removed in production)
      // eslint-disable-next-line no-console
      console.error('Background script error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async performBulkDeletion(events) {
    const results = { successful: [], failed: [] };
    const batchSize = 10;
    const rateLimiter = new RateLimiter(10, 1000); // 10 requests per second
    
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      
      try {
        const batchResults = await Promise.allSettled(
          batch.map(async (event) => {
            await rateLimiter.acquire();
            await this.deleteEvent(event.calendarId, event.actualEventId);
            return { 
              domEventId: event.domEventId, 
              actualEventId: event.actualEventId, 
              title: event.title 
            };
          })
        );
        
        batchResults.forEach((result, index) => {
          const event = batch[index];
          if (result.status === 'fulfilled') {
            results.successful.push(result.value);
          } else {
            results.failed.push({
              domEventId: event.domEventId,
              actualEventId: event.actualEventId,
              title: event.title,
              error: result.reason.message,
              retryable: this.isRetryableError(result.reason)
            });
          }
        });
        
      } catch (batchError) {
        batch.forEach(event => {
          results.failed.push({ 
            domEventId: event.domEventId,
            actualEventId: event.actualEventId,
            title: event.title,
            error: batchError.message, 
            retryable: true 
          });
        });
      }
      
      // Progress update (simplified for now)
      // const progress = Math.min((i + batchSize) / eventIds.length, 1);
    }
    
    return results;
  }

  async deleteEvent(calendarId, eventId) {
    const token = await this.authManager.getValidToken();
    // eslint-disable-next-line no-console
    console.log('Attempting to delete event:', eventId, 'from calendar:', calendarId);
    const encodedCalendarId = encodeURIComponent(calendarId);
    const encodedEventId = encodeURIComponent(eventId);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodedCalendarId}/events/${encodedEventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, retry once
        chrome.identity.removeCachedAuthToken({ token });
        return this.deleteEvent(calendarId, eventId);
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return eventId;
  }

  async getCalendarEvents(calendarId = 'primary', filters = {}) {
    const token = await this.authManager.getValidToken();
    const params = new URLSearchParams({
      maxResults: filters.maxResults || '2500',
      singleEvents: 'true',
      orderBy: 'startTime'
    });

    if (filters.timeMin) params.append('timeMin', filters.timeMin);
    if (filters.timeMax) params.append('timeMax', filters.timeMax);
    if (filters.q) params.append('q', filters.q);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  }

  isRetryableError(error) {
    const retryableCodes = [429, 500, 502, 503, 504];
    return retryableCodes.includes(error.status) || 
           error.message.includes('network') ||
           error.message.includes('timeout');
  }

  async onFirstInstall() {
    // Set default settings
    await chrome.storage.sync.set({
      calendarSettings: {
        confirmDeletions: true,
        batchSize: 10,
        autoBackup: true,
        defaultView: 'week'
      }
    });
  }
}

class AuthManager {
  async getValidToken() {
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
  }

  async revokeToken() {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (token) {
          chrome.identity.removeCachedAuthToken({ token }, () => {
            fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`)
              .then(() => resolve())
              .catch(reject);
          });
        } else {
          resolve();
        }
      });
    });
  }
}

class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  async acquire() {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.acquire();
    }
    
    this.requests.push(now);
  }
}

// Initialize the message router
new MessageRouter();
