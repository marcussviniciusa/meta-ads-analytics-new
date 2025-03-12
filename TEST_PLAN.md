# Meta Ads Analytics Testing Plan

This document outlines the testing strategy for the Meta Ads Analytics implementation, covering both backend and frontend components.

## Testing Environment Setup

### Backend Testing
- **Framework**: Jest
- **Dependencies**: 
  - `supertest` for API testing
  - `axios-mock-adapter` for mocking HTTP requests
- **Configuration**: See `backend/jest.config.js`

### Frontend Testing
- **Framework**: Jest + React Testing Library
- **Dependencies**:
  - `@testing-library/react` for component testing
  - `@testing-library/jest-dom` for DOM assertions
- **Configuration**: See `frontend/jest.config.js`

## Running Tests

### Backend
```bash
cd /home/m/code/speedfunnelsv2/meta-ads-analytics/backend
npm test
```

### Frontend
```bash
cd /home/m/code/speedfunnelsv2/meta-ads-analytics/frontend
npm test
```

## Test Coverage

Both backend and frontend tests are configured to collect coverage information. After running tests, coverage reports will be available in the `coverage` directory of each project.

## Test Categories

### 1. Unit Tests

#### Backend Unit Tests
- **Controller Functions**: Test individual methods in `integrationController.js`
- **Route Handlers**: Test API endpoint handling and parameter validation
- **Database Interactions**: Test database queries and error handling

#### Frontend Unit Tests
- **Service Functions**: Test API client methods in `metaReportService.js`
- **Utility Functions**: Test helper functions for data processing and formatting

### 2. Integration Tests

#### Backend Integration Tests
- **API Endpoints**: Test complete request-response cycles for all Meta Ads endpoints
- **Authentication Flow**: Test token validation and access control
- **Error Handling**: Test appropriate error responses for various failure scenarios

#### Frontend Integration Tests
- **Component Integration**: Test interaction between related components
- **State Management**: Test data flow and state updates across the application

### 3. End-to-End Tests

- **User Workflows**: Test complete user journeys through the application
- **Browser Compatibility**: Test on multiple browsers (Chrome, Firefox, Safari)
- **Responsive Design**: Test on different screen sizes and devices

## Test Cases

### Backend API Tests

1. **Meta Ad Account Details**
   - Test successful retrieval with valid account ID
   - Test authentication failure with invalid token
   - Test authorization failure when user doesn't have access
   - Test error handling for network failures

2. **Meta Ad Campaigns**
   - Test successful retrieval of campaigns list
   - Test filtering by status or objective
   - Test pagination of results
   - Test error handling for invalid parameters

3. **Meta Ad Insights**
   - Test successful retrieval with valid date range
   - Test validation of date parameters
   - Test filtering by metrics
   - Test aggregation by time period

4. **Campaign Insights**
   - Test successful retrieval for specific campaign
   - Test date range filtering
   - Test error handling for invalid campaign ID

5. **Account Management**
   - Test removal of ad account association
   - Test validation of user permissions
   - Test error handling for database operations

### Frontend Component Tests

1. **MetaReports Component**
   - Test initial loading and data fetching
   - Test date range selection
   - Test campaign filtering
   - Test chart and table rendering
   - Test data export functionality
   - Test error handling and user notifications

2. **Filter Functionality**
   - Test filter panel toggling
   - Test applying multiple filters
   - Test resetting filters
   - Test data refresh after filter changes

3. **Visualization Components**
   - Test performance metrics display
   - Test chart rendering with various data sets
   - Test responsive behavior of charts
   - Test tooltips and interactive elements

4. **Data Export**
   - Test CSV export functionality
   - Test handling of large data sets
   - Test error handling during export

## Mock Strategies

1. **Backend Mocks**
   - Mock Redis client for session and token management
   - Mock PostgreSQL pool for database operations
   - Mock Axios requests to Meta Graph API

2. **Frontend Mocks**
   - Mock API responses using Jest mock functions
   - Mock route parameters and navigation
   - Mock date utilities for consistent testing

## Continuous Integration

Tests should be integrated into the CI/CD pipeline to ensure:
- All tests pass before merging new code
- Code coverage meets minimum thresholds
- No regressions are introduced

## Manual Testing Checklist

In addition to automated tests, perform the following manual checks:

1. **Visual Verification**
   - Check chart rendering and styling
   - Verify responsive layout on different devices
   - Verify data presentation matches requirements

2. **Performance Testing**
   - Test loading times with large data sets
   - Monitor memory usage during operations
   - Check network request efficiency

3. **Security Testing**
   - Verify token validation and protection
   - Test for proper error messages (no sensitive data leakage)
   - Verify proper access controls for user data

4. **Accessibility Testing**
   - Test keyboard navigation
   - Verify screen reader compatibility
   - Check color contrast and text readability

## Test Data

- Create a set of test accounts and campaigns in Meta Ads
- Use a mix of real and mocked data for comprehensive testing
- Include edge cases (empty results, maximum values, etc.)
