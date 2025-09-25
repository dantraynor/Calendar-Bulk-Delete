# Calendar Bulk Event Manager

A Chrome extension for efficiently managing and bulk deleting Google Calendar events with advanced filtering capabilities.

## Features

- **Bulk Event Deletion**: Delete multiple calendar events at once with powerful filtering options
- **Secure OAuth Authentication**: Seamless integration with Google Calendar API using OAuth 2.0
- **Advanced Filtering**: Filter events by title keywords, date ranges, and other criteria
- **Real-time Progress Tracking**: Visual progress indicators during bulk operations
- **Rate Limiting**: Intelligent rate limiting to respect Google API limits
- **Error Handling**: Comprehensive error handling with retry mechanisms
- **Manifest V3 Compliance**: Built with the latest Chrome extension standards

## Installation

### For Development

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd chromeextensions
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up OAuth credentials:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google Calendar API
   - Create OAuth 2.0 credentials for a Chrome extension
   - Update `manifest.json` with your client ID

4. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the extension directory
   - The extension should now appear in your extensions list

### OAuth Setup

1. **Google Cloud Console Setup**:
   ```
   1. Go to https://console.cloud.google.com/
   2. Create or select a project
   3. Navigate to "APIs & Services" > "Library"
   4. Search for and enable "Google Calendar API"
   5. Go to "APIs & Services" > "Credentials"
   6. Click "Create Credentials" > "OAuth 2.0 Client ID"
   7. Choose "Chrome extension" as application type
   8. Add your extension ID (found in chrome://extensions/)
   ```

2. **Update manifest.json**:
   ```json
   {
     "oauth2": {
       "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
       "scopes": [
         "https://www.googleapis.com/auth/calendar.events"
       ]
     }
   }
   ```

## Usage

1. **Authentication**:
   - Click on the extension icon in your toolbar
   - Click "Sign in with Google" to authenticate
   - Grant calendar access permissions

2. **Bulk Delete Events**:
   - Navigate to Google Calendar (calendar.google.com)
   - Click the extension icon or use the "Bulk Delete Events" button
   - Apply filters to select specific events:
     - Filter by title keywords
     - Set date ranges
     - Preview selected events
   - Confirm deletion to proceed with bulk operation

3. **Monitoring Progress**:
   - Real-time progress bar during deletion
   - Summary of successful and failed deletions
   - Error details for failed operations

## Development

### Project Structure

```
chromeextensions/
├── manifest.json          # Extension manifest (V3)
├── background.js          # Service worker background script
├── content.js            # Content script for Google Calendar
├── popup.html            # Extension popup interface
├── popup.js              # Popup logic and UI management
├── package.json          # Dependencies and scripts
├── test/                 # Test suite
│   ├── setup.js          # Jest configuration
│   ├── content.test.js   # Content script tests
│   └── background.test.js # Background script tests
└── icons/               # Extension icons (16, 32, 48, 128px)
```

### Available Scripts

```bash
# Run tests
npm test

# Run tests in watch mode
npm test:watch

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Build extension package
npm run package

# Validate extension
npm run validate
```

### Testing

The extension includes comprehensive test coverage:

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test content.test.js
```

### Key Components

1. **Background Script** (`background.js`):
   - Handles OAuth authentication
   - Manages Google Calendar API requests
   - Implements rate limiting and error handling
   - Processes bulk deletion operations

2. **Content Script** (`content.js`):
   - Injects UI components into Google Calendar
   - Handles DOM manipulation and event detection
   - Provides custom dialog system
   - Manages real-time filtering and selection

3. **Popup Interface** (`popup.html`, `popup.js`):
   - Extension management interface
   - Authentication status and controls
   - Quick actions and settings
   - Event statistics and information

## Security & Privacy

- **Minimal Permissions**: Only requests necessary permissions for calendar access
- **Secure OAuth**: Uses Google's OAuth 2.0 flow with appropriate scopes
- **No Data Storage**: No personal calendar data is stored locally
- **Rate Limiting**: Respects Google API rate limits to prevent abuse
- **Error Handling**: Secure error handling without exposing sensitive information

## API Usage

The extension uses the Google Calendar API v3 with the following endpoints:

- `GET /calendars/primary/events` - Fetch calendar events
- `DELETE /calendars/{calendarId}/events/{eventId}` - Delete individual events

Rate limiting is implemented to stay within Google's API quotas:
- 10 requests per second (default)
- Configurable batch sizes
- Automatic retry for rate-limited requests

## Troubleshooting

### Common Issues

1. **Authentication Failures**:
   - Verify OAuth client ID in manifest.json
   - Check that Calendar API is enabled in Google Cloud Console
   - Ensure extension ID is added to OAuth credentials

2. **Extension Not Loading**:
   - Check for manifest.json syntax errors
   - Verify all required files are present
   - Look for console errors in Chrome DevTools

3. **API Rate Limiting**:
   - Extension automatically handles rate limits
   - Reduce batch size in settings if needed
   - Wait for quota reset if limits exceeded

### Debug Mode

Enable debug logging by setting:
```javascript
// In popup.js or content.js
const DEBUG = true;
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Run the test suite: `npm test`
5. Commit your changes: `git commit -m "Add feature"`
6. Push to your branch: `git push origin feature-name`
7. Submit a pull request

## Chrome Web Store Publication

### Preparation Checklist

- [ ] Test thoroughly across different Chrome versions
- [ ] Verify OAuth configuration with real credentials
- [ ] Complete privacy policy and terms of service
- [ ] Prepare store listing materials (screenshots, descriptions)
- [ ] Test with various calendar configurations
- [ ] Validate all permissions are minimal and necessary

### Store Assets Required

1. **Icons**: 16x16, 32x32, 48x48, 128x128 px
2. **Screenshots**: 1280x800 px (desktop), 640x400 px (mobile)
3. **Promotional tile**: 440x280 px
4. **Description**: Clear explanation of functionality
5. **Privacy policy**: Required for data access
6. **Detailed description**: Feature list and usage instructions

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

For issues and questions:
- Check the [Issues](../../issues) section
- Review troubleshooting guide above
- Contact: your-email@example.com

## Changelog

### v1.0.0 (Initial Release)
- Bulk event deletion with filtering
- OAuth 2.0 authentication
- Real-time progress tracking
- Comprehensive error handling
- Manifest V3 compliance