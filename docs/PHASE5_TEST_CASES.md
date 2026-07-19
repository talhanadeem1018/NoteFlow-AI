# Phase 5 Test Cases

## Authentication
- Register with valid credentials
- Login with valid credentials
- Login with invalid credentials
- Logout and clear session state
- Restore session after refresh
- Forgot password workflow
- Access protected APIs with and without token
- Validate expired or invalid JWT handling

## Routing
- Guest users can access public pages
- Authenticated users are redirected from guest-only pages
- Redirect to dashboard after successful login
- Redirect to home after logout

## Notes
- Create a new note
- Read notes for the current user
- Update an existing note
- Delete an existing note
- Prevent unauthorized access to another user’s notes

## Swagger
- Authorize using a bearer token
- Access protected endpoints successfully
- Reject unauthenticated requests clearly
