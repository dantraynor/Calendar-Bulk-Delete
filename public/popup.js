/**
 * Calendar Bulk Event Manager - Popup Script
 * Handles the popup interface and communication with background script
 */

class PopupManager {
  constructor() {
    this.isAuthenticated = false;
    this.currentTab = null;
    this.eventStats = { count: 0, lastUpdate: null };
    this.init();
  }

  async init() {
    await this.getCurrentTab();
    this.setupEventListeners();
    await this.checkAuthentication();
    this.updateUI();
  }

  async getCurrentTab() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tabs[0];
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error querying tabs:', error);
      this.currentTab = null;
    }
  }

  setupEventListeners() {
    // Authentication
    document.getElementById('auth-btn').addEventListener('click', () => this.authenticate());
    document.getElementById('revoke-btn').addEventListener('click', () => this.revokeAuth());

    // Actions
    document.getElementById('open-calendar-btn').addEventListener('click', () => this.openCalendar());
    document.getElementById('bulk-delete-btn').addEventListener('click', () => this.triggerBulkDelete());
    document.getElementById('refresh-btn').addEventListener('click', () => this.refreshData());
    document.getElementById('settings-btn').addEventListener('click', () => this.openSettings());

    // Footer links
    document.getElementById('help-link').addEventListener('click', (e) => {
      e.preventDefault();
      this.openHelp();
    });
    
    document.getElementById('privacy-link').addEventListener('click', (e) => {
      e.preventDefault();
      this.openPrivacyPolicy();
    });
    
    document.getElementById('feedback-link').addEventListener('click', (e) => {
      e.preventDefault();
      this.openFeedback();
    });
  }

  async checkAuthentication() {
    this.showLoading(true);
    
    try {
      const response = await chrome.runtime.sendMessage({ action: 'GET_AUTH_TOKEN' });
      this.isAuthenticated = response.success && response.token;
      
      if (this.isAuthenticated) {
        await this.loadEventStats();
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Authentication check failed:', error);
      this.isAuthenticated = false;
    }
    
    this.showLoading(false);
  }

  async authenticate() {
    this.showLoading(true);
    
    try {
      const response = await chrome.runtime.sendMessage({ action: 'GET_AUTH_TOKEN' });
      
      if (response.success) {
        this.isAuthenticated = true;
        this.showAlert('Successfully authenticated with Google Calendar!', 'success');
        await this.loadEventStats();
      } else {
        this.showAlert('Authentication failed: ' + response.error, 'error');
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Authentication error:', error);
      this.showAlert('Authentication error: ' + error.message, 'error');
    }
    
    this.showLoading(false);
    this.updateUI();
  }

  async revokeAuth() {
    this.showLoading(true);
    
    try {
      const response = await chrome.runtime.sendMessage({ action: 'REVOKE_AUTH' });
      
      if (response.success) {
        this.isAuthenticated = false;
        this.eventStats = { count: 0, lastUpdate: null };
        this.showAlert('Successfully signed out from Google Calendar', 'success');
      } else {
        this.showAlert('Sign out failed: ' + response.error, 'error');
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Sign out error:', error);
      this.showAlert('Sign out error: ' + error.message, 'error');
    }
    
    this.showLoading(false);
    this.updateUI();
  }

  async loadEventStats() {
    if (!this.isAuthenticated) return;
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'GET_CALENDAR_EVENTS',
        calendarId: 'primary',
        filters: { maxResults: 100 }
      });
      
      if (response.success) {
        this.eventStats = {
          count: response.events.length,
          lastUpdate: new Date().toLocaleTimeString()
        };
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load event stats:', error);
    }
  }

  updateUI() {
    const authStatus = document.getElementById('auth-status');
    const authBtn = document.getElementById('auth-btn');
    const revokeBtn = document.getElementById('revoke-btn');
    const statsSection = document.getElementById('stats-section');
    const actionsSection = document.getElementById('actions-section');
    const quickActions = document.getElementById('quick-actions');

    if (this.isAuthenticated) {
      authStatus.textContent = 'Authenticated with Google Calendar';
      authStatus.className = 'auth-status authenticated';
      authBtn.style.display = 'none';
      revokeBtn.style.display = 'inline-block';
      
      statsSection.style.display = 'block';
      actionsSection.style.display = 'block';
      quickActions.style.display = 'grid';

      // Update stats
      document.getElementById('event-count').textContent = this.eventStats.count;
      document.getElementById('last-update').textContent = 
        this.eventStats.lastUpdate || '--';

      // Enable/disable bulk delete based on current page
      const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
      const isOnCalendar = this.currentTab?.url?.includes('calendar.google.com');
      
      if (isOnCalendar) {
        bulkDeleteBtn.disabled = false;
        bulkDeleteBtn.textContent = 'Delete Events';
      } else {
        bulkDeleteBtn.disabled = true;
        bulkDeleteBtn.textContent = 'Open Calendar First';
      }
    } else {
      authStatus.textContent = 'Not authenticated. Sign in to access your calendar.';
      authStatus.className = 'auth-status not-authenticated';
      authBtn.style.display = 'inline-block';
      revokeBtn.style.display = 'none';
      
      statsSection.style.display = 'none';
      actionsSection.style.display = 'none';
      quickActions.style.display = 'none';
    }
  }

  async openCalendar() {
    try {
      await chrome.tabs.create({ url: 'https://calendar.google.com' });
      window.close();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to open calendar:', error);
      this.showAlert('Failed to open calendar', 'error');
    }
  }

  async triggerBulkDelete() {
    if (!this.isAuthenticated) {
      this.showAlert('Please authenticate first', 'error');
      return;
    }

    const isOnCalendar = this.currentTab?.url?.includes('calendar.google.com');
    if (!isOnCalendar) {
      this.showAlert('Please navigate to Google Calendar first', 'error');
      return;
    }

    try {
      // Send message to content script to trigger bulk delete dialog
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        type: 'TRIGGER_BULK_DELETE'
      });
      
      if (response?.success) {
        // Close popup so user can interact with the calendar page
        window.close();
      } else {
        this.showAlert('Bulk delete not available. Please refresh the calendar page.', 'error');
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to trigger bulk delete:', error);
      this.showAlert('Please refresh the calendar page and try again', 'error');
    }
  }

  async refreshData() {
    if (!this.isAuthenticated) return;
    
    this.showLoading(true);
    await this.loadEventStats();
    this.showLoading(false);
    this.updateUI();
    this.showAlert('Data refreshed successfully', 'success');
  }

  openSettings() {
    // For now, just show an alert.
    this.showAlert('Settings feature coming soon!', 'success');
  }

  openHelp() {
    chrome.tabs.create({ 
      url: 'https://tesseras.org/calendar-bulk-delete.html'
    });
  }

  openPrivacyPolicy() {
    // Open the external privacy policy in a new tab
    chrome.tabs.create({ 
      url: 'https://tesseras.org/privacy-policy.html'
    });
  }

  openFeedback() {
    // Open GitHub issues for feedback
    chrome.tabs.create({ 
      url: 'https://github.com/tesseras/calendar-bulk-delete/issues'
    });
  }

  showLoading(show) {
    const loading = document.getElementById('loading');
    const mainContent = document.getElementById('main-content');
    
    loading.style.display = show ? 'block' : 'none';
    mainContent.style.display = show ? 'none' : 'block';
  }

  showAlert(message, type = 'success') {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    const content = document.querySelector('.content');
    content.insertBefore(alert, content.firstChild);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (alert.parentNode) {
        alert.parentNode.removeChild(alert);
      }
    }, 3000);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});

// Handle messages from content script or background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'POPUP_UPDATE_STATS') {
    // Update popup stats if needed
    // eslint-disable-next-line no-console
    console.log('Stats update received:', message.stats);
  }
});