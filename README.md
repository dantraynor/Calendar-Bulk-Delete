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

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Run the test suite: `npm test`
5. Commit your changes: `git commit -m "Add feature"`
6. Push to your branch: `git push origin feature-name`
7. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

For issues and questions:
- Open an issue or email support@tesseras.org
