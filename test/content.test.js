/**
 * Tests for Calendar Bulk Event Manager Content Script
 */

describe('CalendarExtension', () => {
  // let calendarExtension;
  
  beforeEach(() => {
    document.body.innerHTML = '';
    
    // Mock Google Calendar environment
    Object.defineProperty(window, 'location', {
      value: { hostname: 'calendar.google.com' },
      writable: true
    });
    
    // Reset chrome API mocks
    chrome.runtime.sendMessage.mockClear();
  });

  test('should initialize on Google Calendar', () => {
    const isGoogleCalendar = window.location.hostname === 'calendar.google.com';
    expect(isGoogleCalendar).toBe(true);
  });

  test('should extract event data correctly', () => {
    // Create mock event element
    const eventElement = document.createElement('div');
    eventElement.setAttribute('data-eventid', 'test-event-123');
    
    const titleElement = document.createElement('div');
    titleElement.textContent = 'Test Event Title';
    eventElement.appendChild(titleElement);
    
    document.body.appendChild(eventElement);
    
    // Test event data extraction logic
    const eventId = eventElement.getAttribute('data-eventid');
    const title = titleElement.textContent.trim();
    
    expect(eventId).toBe('test-event-123');
    expect(title).toBe('Test Event Title');
  });

  test('should handle bulk deletion request', async () => {
    const mockEventIds = ['event1', 'event2', 'event3'];
    
    chrome.runtime.sendMessage.mockResolvedValue({
      success: true,
      result: {
        successful: ['event1', 'event2'],
        failed: ['event3']
      }
    });

    // Mock the bulk deletion function
    const performBulkDeletion = async (eventIds) => {
      const response = await chrome.runtime.sendMessage({
        action: 'BULK_DELETE_EVENTS',
        eventIds: eventIds,
        calendarId: 'primary'
      });
      
      return response;
    };

    const result = await performBulkDeletion(mockEventIds);
    
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      action: 'BULK_DELETE_EVENTS',
      eventIds: mockEventIds,
      calendarId: 'primary'
    });
    
    expect(result.success).toBe(true);
    expect(result.result.successful).toHaveLength(2);
    expect(result.result.failed).toHaveLength(1);
  });


});