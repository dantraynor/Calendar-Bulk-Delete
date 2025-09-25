/**
 * Calendar Bulk Delete - Content Script
 * Handles DOM manipulation and UI injection for Google Calendar
 */

class CalendarExtension {
  constructor() {
    this.observer = null;
    this.dialogManager = new CustomDialogManager();
    this.eventCache = new Map();
    this.isProcessing = false;
    this.init();
  }

  init() {
    if (this.isGoogleCalendar()) {
      this.setupMutationObserver();
      this.setupNavigationDetection();
      this.injectExtensionStyles();
      this.injectUI();
      // eslint-disable-next-line no-console
      console.log('Calendar Bulk Delete initialized');
    }
  }

  isGoogleCalendar() {
    return window.location.hostname === 'calendar.google.com';
  }

  setupMutationObserver() {
    this.observer = new MutationObserver((mutations) => {
      const relevantChanges = mutations.filter(mutation => 
        mutation.type === 'childList' && 
        mutation.addedNodes.length > 0
      );

      if (relevantChanges.length > 0) {
        this.handleCalendarChanges(relevantChanges);
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });
  }

  setupNavigationDetection() {
    // Handle Google Calendar's SPA navigation
    const originalPushState = history.pushState;
    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      setTimeout(() => this.reinitialize(), 500);
    };

    window.addEventListener('popstate', () => {
      setTimeout(() => this.reinitialize(), 500);
    });
  }

  reinitialize() {
    this.eventCache.clear();
    this.injectUI();
  }

  handleCalendarChanges(mutations) {
    // Check if new events were added to the calendar
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const events = node.querySelectorAll('[data-eventid]');
          if (events.length > 0) {
            this.cacheEvents(events);
          }
        }
      });
    });
  }

  cacheEvents(eventElements) {
    eventElements.forEach(element => {
      const eventId = element.getAttribute('data-eventid');
      if (eventId && !this.eventCache.has(eventId)) {
        const eventData = this.extractEventData(element);
        this.eventCache.set(eventId, eventData);
      }
    });
  }

  extractEventData(element) {
    const titleElement = element.querySelector('[data-text]') || 
                        element.querySelector('.xEaWP') ||
                        element;
    
    const domEventId = element.getAttribute('data-eventid');
    const parsedEventData = this.parseEventId(domEventId);
    
    return {
      id: domEventId, // Keep DOM ID for element mapping
      actualEventId: parsedEventData.eventId, // Real Google Calendar event ID
      calendarId: parsedEventData.calendarId, // Real calendar ID
      title: titleElement?.textContent?.trim() || 'Untitled Event',
      element: element,
      startTime: this.extractStartTime(element),
      endTime: this.extractEndTime(element),
      canDelete: parsedEventData.canDelete
    };
  }

  parseEventId(domEventId) {
    if (!domEventId) {
      return { eventId: null, calendarId: null, canDelete: false };
    }

    try {
      // Decode the base64 DOM event ID
      const decoded = atob(domEventId);
      
      // The decoded format is typically: "YYYYMMDD_<actual_event_id> <calendar_id>"
      // Example: "20250901_9u2pou9j855ujfp8l4gqsqpbv4 en.usa#holiday@group.v.calendar.google.com"
      const parts = decoded.split(' ');
      
      if (parts.length >= 2) {
        const dateAndEventId = parts[0];
        const calendarId = parts.slice(1).join(' ');
        
        // Extract the actual event ID (everything after the date prefix)
        const eventIdMatch = dateAndEventId.match(/^\d{8}_(.+)$/);
        const actualEventId = eventIdMatch ? eventIdMatch[1] : dateAndEventId;
        
        // Determine if this event can be deleted
        const canDelete = this.canDeleteFromCalendar(calendarId);
        
        return {
          eventId: actualEventId,
          calendarId: calendarId,
          canDelete: canDelete
        };
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to parse event ID:', domEventId, error);
    }

    return { eventId: null, calendarId: null, canDelete: false };
  }

  canDeleteFromCalendar(calendarId) {
    // Read-only calendars that users typically can't modify
    const readOnlyCalendars = [
      'en.usa#holiday@group.v.calendar.google.com',
      'en.uk#holiday@group.v.calendar.google.com',
      'en.canadian#holiday@group.v.calendar.google.com',
      'jewish#holiday@group.v.calendar.google.com',
      'en.christian#holiday@group.v.calendar.google.com',
      'en.islamic#holiday@group.v.calendar.google.com'
    ];
    
    // Check if it's a known read-only calendar
    if (readOnlyCalendars.some(readOnly => calendarId.includes(readOnly))) {
      return false;
    }
    
    // Check if it's a holiday calendar (contains "#holiday@")
    if (calendarId.includes('#holiday@')) {
      return false;
    }
    
    // Primary calendar and user's personal calendars are typically modifiable
    return true;
  }

  extractStartTime(element) {
    // Try to extract start time from various possible attributes
    const timeAttr = element.getAttribute('data-start-time') ||
                    element.getAttribute('data-eventstart');
    return timeAttr || null;
  }

  extractEndTime(element) {
    // Try to extract end time from various possible attributes  
    const timeAttr = element.getAttribute('data-end-time') ||
                    element.getAttribute('data-eventend');
    return timeAttr || null;
  }

  injectExtensionStyles() {
    if (document.querySelector('#calendar-extension-styles')) return;
    
    const styleSheet = document.createElement('style');
    styleSheet.id = 'calendar-extension-styles';
    styleSheet.textContent = `
      .extension-bulk-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        color: #5f6368;
        border: 1px solid #dadce0;
        border-radius: 4px;
        padding: 8px 12px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
        margin: 0 4px;
        width: 40px;
        height: 40px;
        z-index: 1000;
        position: relative;
      }
      
      .extension-bulk-button::before {
        content: "";
        width: 20px;
        height: 20px;
        background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16" fill="%235f6368"><path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 1.152l.557 10.021A1.5 1.5 0 0 0 4.55 15h6.9a1.5 1.5 0 0 0 1.497-1.327l.557-10.021A.58.58 0 0 0 13.494 2.5H11Zm-5.5 3a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6Z"/></svg>');
        background-repeat: no-repeat;
        background-position: center;
        background-size: contain;
      }
      
      .extension-bulk-button:hover {
        background: #f1f3f4;
        border-color: #c4c7ca;
      }
      
      .extension-dialog {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.24);
        z-index: 1000000;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
      }
      
      .extension-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 999999;
      }
      
      .extension-dialog-content {
        padding: 24px;
      }
      
      .extension-dialog h2 {
        margin: 0 0 16px 0;
        font-size: 20px;
        font-weight: 500;
        color: #202124;
      }
      
      .extension-dialog p {
        margin: 0 0 20px 0;
        color: #5f6368;
        line-height: 1.4;
      }
      
      .extension-dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 24px;
      }
      
      .extension-btn {
        border: none;
        border-radius: 4px;
        padding: 8px 16px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      
      .extension-btn-cancel {
        background: transparent;
        color: #1a73e8;
      }
      
      .extension-btn-cancel:hover {
        background: rgba(26, 115, 232, 0.04);
      }
      
      .extension-btn-confirm {
        background: #d93025;
        color: white;
      }
      
      .extension-btn-confirm:hover {
        background: #b52d20;
      }
      
      .extension-progress {
        margin: 16px 0;
      }
      
      .extension-progress-bar {
        width: 100%;
        height: 4px;
        background: #e8eaed;
        border-radius: 2px;
        overflow: hidden;
      }
      
      .extension-progress-fill {
        height: 100%;
        background: #1a73e8;
        transition: width 0.3s ease;
      }
      
      .extension-event-list {
        max-height: 300px;
        overflow-y: auto;
        border: 1px solid #dadce0;
        border-radius: 4px;
        margin: 16px 0;
      }
      
      .extension-event-item {
        padding: 8px 12px;
        border-bottom: 1px solid #f1f3f4;
        font-size: 13px;
      }
      
      .extension-event-item:last-child {
        border-bottom: none;
      }
      
      .extension-filters {
        margin: 16px 0;
        padding: 16px;
        background: #f8f9fa;
        border-radius: 4px;
      }
      
      .extension-filter-group {
        margin-bottom: 12px;
      }
      
      .extension-filter-group label {
        display: block;
        font-weight: 500;
        margin-bottom: 4px;
        color: #202124;
      }
      
      .extension-filter-input {
        width: 100%;
        padding: 8px;
        border: 1px solid #dadce0;
        border-radius: 4px;
        font-size: 14px;
      }
    `;
    
    document.head.appendChild(styleSheet);
  }

  injectUI() {
    // Remove existing button if present
    const existingButton = document.querySelector('.extension-bulk-button');
    if (existingButton) {
      existingButton.remove();
    }

    // Find the toolbar area with search button and other controls
    const toolbarSelectors = [
      '.gb_Pc',                           // Google toolbar
      '[role="toolbar"]',                 // Generic toolbar
      '.XWf0Se',                         // Calendar toolbar
      '.nEhse'                           // Calendar header controls
    ];

    let targetContainer = null;
    
    // First, try to find the specific container with search button
    const searchButton = document.querySelector('[aria-label*="Search"], [data-tooltip*="Search"], .gb_ef');
    if (searchButton) {
      targetContainer = searchButton.closest('[role="toolbar"]') || 
                       searchButton.closest('.gb_Pc') ||
                       searchButton.closest('.XWf0Se') ||
                       searchButton.parentElement;
    }

    // Fallback to toolbar selectors if search button container not found
    if (!targetContainer) {
      for (const selector of toolbarSelectors) {
        targetContainer = document.querySelector(selector);
        if (targetContainer) {
          break;
        }
      }
    }

    // Create bulk action button
    const bulkButton = document.createElement('button');
    bulkButton.textContent = '';  // Using CSS ::before for icon
    bulkButton.className = 'extension-bulk-button';
    bulkButton.title = 'Bulk Delete Calendar Events';
    bulkButton.addEventListener('click', () => this.showBulkDeleteDialog());
    
    // Position the button next to the search button if possible
    if (searchButton && targetContainer) {
      // Insert right after the search button
      const searchParent = searchButton.parentElement;
      if (searchParent && targetContainer.contains(searchParent)) {
        searchParent.insertAdjacentElement('afterend', bulkButton);
      } else if (targetContainer.contains(searchButton)) {
        searchButton.insertAdjacentElement('afterend', bulkButton);
      } else {
        targetContainer.appendChild(bulkButton);
      }
    } else if (targetContainer) {
      targetContainer.appendChild(bulkButton);
    } else {
      // Fallback to body with better positioning
      bulkButton.style.position = 'fixed';
      bulkButton.style.top = '120px';
      bulkButton.style.right = '20px';
      document.body.appendChild(bulkButton);
    }
  }

  async showBulkDeleteDialog() {
    if (this.isProcessing) return;

    try {
      // Get events from current view
      const events = await this.getCurrentViewEvents();
      
      if (events.length === 0) {
        this.dialogManager.showAlert('No events found in current view.');
        return;
      }

      const confirmed = await this.dialogManager.showBulkDeleteDialog(events);
      if (confirmed) {
        await this.performBulkDeletion(confirmed.eventIds);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error showing bulk delete dialog:', error);
      this.dialogManager.showAlert('Error: ' + error.message);
    }
  }

  async getCurrentViewEvents() {
    // First try to get events from cache
    let events = Array.from(this.eventCache.values());
    
    // If cache is empty, try to extract from DOM
    if (events.length === 0) {
      const eventElements = document.querySelectorAll('[data-eventid]');
      eventElements.forEach(element => {
        const eventData = this.extractEventData(element);
        this.eventCache.set(eventData.id, eventData);
        events.push(eventData);
      });
    }
    
    // If still no events, fetch from API
    if (events.length === 0) {
      const requestedCalendarId = 'primary';
      const response = await chrome.runtime.sendMessage({
        action: 'GET_CALENDAR_EVENTS',
        calendarId: requestedCalendarId,
        filters: this.getCurrentViewFilters()
      });
      
      if (response.success) {
        events = response.events.map(event => {
          const calendarId = event.organizer?.email || event.creator?.email || requestedCalendarId;
          const eventData = {
            id: event.id,
            actualEventId: event.id,
            calendarId,
            title: event.summary || 'Untitled Event',
            element: null,
            startTime: event.start?.dateTime || event.start?.date || null,
            endTime: event.end?.dateTime || event.end?.date || null,
            canDelete: this.canDeleteFromCalendar(calendarId)
          };

          this.eventCache.set(eventData.id, eventData);
          return eventData;
        });
      }
    }
    
    return events;
  }

  getCurrentViewFilters() {
    // Extract current view parameters from URL or UI
    const url = new URL(window.location.href);
    const view = url.searchParams.get('view') || 'week';
    
    // This is a simplified filter - you might want to make it more sophisticated
    return {
      maxResults: 2500,
      view: view
    };
  }

  async performBulkDeletion(eventDomIds) {
    this.isProcessing = true;
    
    try {
      // Convert DOM event IDs to API event data
      const eventsToDelete = [];
      const nonDeletableEvents = [];
      
      for (const domEventId of eventDomIds) {
        const cachedEvent = this.eventCache.get(domEventId);
        if (cachedEvent) {
          if (cachedEvent.canDelete && cachedEvent.actualEventId && cachedEvent.calendarId) {
            eventsToDelete.push({
              domEventId: domEventId,
              actualEventId: cachedEvent.actualEventId,
              calendarId: cachedEvent.calendarId,
              title: cachedEvent.title
            });
          } else {
            nonDeletableEvents.push({
              domEventId: domEventId,
              title: cachedEvent.title,
              reason: cachedEvent.canDelete ? 'Missing event data' : 'Read-only calendar'
            });
          }
        }
      }
      
      // Show warning if some events can't be deleted
      if (nonDeletableEvents.length > 0) {
        const warningMessage = `${nonDeletableEvents.length} events cannot be deleted:\n\n` +
          nonDeletableEvents.map(e => `• ${e.title} (${e.reason})`).slice(0, 5).join('\n') +
          (nonDeletableEvents.length > 5 ? `\n... and ${nonDeletableEvents.length - 5} more` : '');
        
        await this.dialogManager.showAlert(warningMessage);
      }
      
      if (eventsToDelete.length === 0) {
        this.dialogManager.showAlert('No events can be deleted.');
        return;
      }
      
      const progressDialog = this.dialogManager.showProgress(`Deleting ${eventsToDelete.length} events...`, 0);
      
      const response = await chrome.runtime.sendMessage({
        action: 'BULK_DELETE_EVENTS',
        events: eventsToDelete // Send full event data instead of just IDs
      });
      
      this.dialogManager.closeDialog(progressDialog);
      
      if (response.success) {
        const { successful, failed } = response.result;
        
        // Clear cache and remove from DOM for successfully deleted events
        successful.forEach(result => {
          this.eventCache.delete(result.domEventId);
          const element = document.querySelector(`[data-eventid="${result.domEventId}"]`);
          if (element) {
            element.remove();
          }
        });
        
        // Show results
        let message = `Successfully deleted ${successful.length} events.`;
        if (failed.length > 0) {
          message += `\n${failed.length} events failed to delete.`;
          if (failed.length <= 3) {
            message += '\n\nFailed events:\n' + failed.map(f => `• ${f.title}: ${f.error}`).join('\n');
          }
        }
        if (nonDeletableEvents.length > 0) {
          message += `\n${nonDeletableEvents.length} events were skipped (read-only calendars).`;
        }
        
        this.dialogManager.showAlert(message);
        
        // Refresh calendar view
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        
      } else {
        this.dialogManager.showAlert('Error: ' + response.error);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Bulk deletion error:', error);
      this.dialogManager.showAlert('Error: ' + error.message);
    } finally {
      this.isProcessing = false;
    }
  }
}

class CustomDialogManager {
  showAlert(message) {
    const dialog = this.createDialog({
      type: 'alert',
      title: 'Calendar Bulk Delete',
      message: message,
      confirmText: 'OK'
    });
    
    return new Promise((resolve) => {
      const confirmBtn = dialog.querySelector('.extension-btn-confirm');
      confirmBtn.addEventListener('click', () => {
        this.closeDialog(dialog);
        resolve(true);
      });
      
      document.body.appendChild(dialog);
    });
  }

  showBulkDeleteDialog(events) {
    return new Promise((resolve) => {
      const dialog = this.createBulkDeleteDialog(events, resolve);
      document.body.appendChild(dialog);
    });
  }

  createBulkDeleteDialog(events, resolve) {
    const dialogElement = document.createElement('div');
    dialogElement.innerHTML = `
      <div class="extension-backdrop"></div>
      <div class="extension-dialog" role="dialog" aria-modal="true">
        <div class="extension-dialog-content">
          <h2>Bulk Delete Calendar Events</h2>
          <p>Found ${events.length} events (${events.filter(e => e.canDelete).length} can be deleted, ${events.filter(e => !e.canDelete).length} are read-only). Configure filters below:</p>
          
          <div class="extension-filters">
            <div class="extension-filter-group">
              <label for="title-filter">Filter by title (optional):</label>
              <input type="text" id="title-filter" class="extension-filter-input" 
                     placeholder="Enter keywords to filter events">
            </div>
            
            <div class="extension-filter-group">
              <label for="date-from">From date (optional):</label>
              <input type="date" id="date-from" class="extension-filter-input">
            </div>
            
            <div class="extension-filter-group">
              <label for="date-to">To date (optional):</label>
              <input type="date" id="date-to" class="extension-filter-input">
            </div>
          </div>
          
          <div class="extension-event-list" id="filtered-events">
            ${events.map(event => `
              <div class="extension-event-item" data-event-id="${event.id}">
                <strong>${this.escapeHtml(event.title)}</strong>
                ${event.startTime ? `<br><small>${new Date(event.startTime).toLocaleString()}</small>` : ''}
              </div>
            `).join('')}
          </div>
          
          <div class="extension-dialog-actions">
            <button class="extension-btn extension-btn-cancel">Cancel</button>
            <button class="extension-btn extension-btn-confirm">Delete Selected Events</button>
          </div>
        </div>
      </div>
    `;

    this.attachBulkDeleteEvents(dialogElement, events, resolve);
    return dialogElement;
  }

  attachBulkDeleteEvents(dialogElement, allEvents, resolve) {
    const cancelBtn = dialogElement.querySelector('.extension-btn-cancel');
    const confirmBtn = dialogElement.querySelector('.extension-btn-confirm');
    const titleFilter = dialogElement.querySelector('#title-filter');
    const dateFrom = dialogElement.querySelector('#date-from');
    const dateTo = dialogElement.querySelector('#date-to');
    const eventsList = dialogElement.querySelector('#filtered-events');

    let filteredEvents = [...allEvents];

    const updateFilteredEvents = () => {
      const titleKeyword = titleFilter.value.toLowerCase().trim();
      const fromDate = dateFrom.value ? new Date(dateFrom.value) : null;
      const toDate = dateTo.value ? new Date(dateTo.value) : null;

      filteredEvents = allEvents.filter(event => {
        // Skip read-only events
        if (!event.canDelete) {
          return false;
        }
        
        // Title filter
        if (titleKeyword && !event.title.toLowerCase().includes(titleKeyword)) {
          return false;
        }
        
        // Date filters
        if (event.startTime) {
          const eventDate = new Date(event.startTime);
          if (fromDate && eventDate < fromDate) return false;
          if (toDate && eventDate > toDate) return false;
        }
        
        return true;
      });

      // Update display
      eventsList.innerHTML = filteredEvents.map(event => `
        <div class="extension-event-item" data-event-id="${event.id}">
          <strong>${this.escapeHtml(event.title)}</strong>
          ${event.startTime ? `<br><small>${new Date(event.startTime).toLocaleString()}</small>` : ''}
        </div>
      `).join('');

      confirmBtn.textContent = `Delete ${filteredEvents.length} Events`;
      confirmBtn.disabled = filteredEvents.length === 0;
    };

    // Add event listeners for real-time filtering
    titleFilter.addEventListener('input', updateFilteredEvents);
    dateFrom.addEventListener('change', updateFilteredEvents);
    dateTo.addEventListener('change', updateFilteredEvents);

    cancelBtn.addEventListener('click', () => {
      this.closeDialog(dialogElement);
      resolve(null);
    });

    confirmBtn.addEventListener('click', async () => {
      if (filteredEvents.length === 0) return;
      
      const finalConfirm = await this.showConfirm(
        `Are you sure you want to delete ${filteredEvents.length} events? This action cannot be undone.`,
        'Confirm Deletion'
      );
      
      if (finalConfirm) {
        this.closeDialog(dialogElement);
        resolve({
          eventIds: filteredEvents.map(e => e.id),
          filters: {
            titleKeyword: titleFilter.value,
            fromDate: dateFrom.value,
            toDate: dateTo.value
          }
        });
      }
    });

    // Initial update
    updateFilteredEvents();
  }

  showConfirm(message, title = 'Confirm') {
    return new Promise((resolve) => {
      const dialog = this.createDialog({
        type: 'confirm',
        title,
        message,
        confirmText: 'Confirm',
        cancelText: 'Cancel'
      });
      
      const cancelBtn = dialog.querySelector('.extension-btn-cancel');
      const confirmBtn = dialog.querySelector('.extension-btn-confirm');
      
      cancelBtn.addEventListener('click', () => {
        this.closeDialog(dialog);
        resolve(false);
      });
      
      confirmBtn.addEventListener('click', () => {
        this.closeDialog(dialog);
        resolve(true);
      });
      
      document.body.appendChild(dialog);
    });
  }

  showProgress(message, progress) {
    const dialogElement = document.createElement('div');
    dialogElement.innerHTML = `
      <div class="extension-backdrop"></div>
      <div class="extension-dialog" role="dialog" aria-modal="true">
        <div class="extension-dialog-content">
          <h2>Processing...</h2>
          <p>${message}</p>
          <div class="extension-progress">
            <div class="extension-progress-bar">
              <div class="extension-progress-fill" style="width: ${progress}%"></div>
            </div>
            <p id="progress-text">${progress}% complete</p>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialogElement);
    return dialogElement;
  }

  updateProgress(dialog, percent) {
    const fill = dialog.querySelector('.extension-progress-fill');
    const text = dialog.querySelector('#progress-text');
    
    if (fill) fill.style.width = `${percent}%`;
    if (text) text.textContent = `${percent}% complete`;
  }

  createDialog(options) {
    const dialogElement = document.createElement('div');
    dialogElement.innerHTML = `
      <div class="extension-backdrop"></div>
      <div class="extension-dialog" role="dialog" aria-modal="true">
        <div class="extension-dialog-content">
          <h2>${options.title}</h2>
          <p>${options.message}</p>
          <div class="extension-dialog-actions">
            ${options.type === 'confirm' ? 
              `<button class="extension-btn extension-btn-cancel">${options.cancelText}</button>` : 
              ''
            }
            <button class="extension-btn extension-btn-confirm">${options.confirmText}</button>
          </div>
        </div>
      </div>
    `;
    
    return dialogElement;
  }

  closeDialog(dialog) {
    if (dialog && dialog.parentNode) {
      dialog.parentNode.removeChild(dialog);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Message handler for popup communication
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TRIGGER_BULK_DELETE') {
    // Find the extension instance and trigger bulk delete
    const bulkButton = document.querySelector('.extension-bulk-button');
    if (bulkButton) {
      bulkButton.click();
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'Bulk delete button not found' });
    }
    return true; // Keep the message channel open for async response
  }
});

// Initialize the extension when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new CalendarExtension();
  });
} else {
  new CalendarExtension();
}
