# API Test Cases

## QA Test Matrix

| Test ID | Module | Endpoint | Scenario | Input | Expected Result | Actual Result | Status | Priority |
|---|---|---|---|---|---|---|---|---|
| TC-01 | YouTube Validation | POST /api/v1/metadata | Valid YouTube URL | Sample URL | Metadata response returned | Evidence Not Available | NOT TESTED | High |
| TC-02 | YouTube Validation | POST /api/v1/metadata | Invalid URL | Malformed URL | Validation error returned | Evidence Not Available | NOT TESTED | High |
| TC-03 | Audio Download | POST /api/v1/audio | Valid YouTube URL | Sample URL | Audio processing begins and returns response | Evidence Not Available | NOT TESTED | High |
| TC-04 | Audio Conversion | Internal service | Converted audio output | Downloaded audio file | WAV output file is created | Evidence Not Available | NOT TESTED | High |
| TC-05 | FFprobe | Internal service | Duration extraction | Converted audio file | Duration is extracted | Evidence Not Available | NOT TESTED | Medium |
| TC-06 | Cleanup | Internal service | Temporary file handling | Completed workflow | Temporary files are cleaned up | Evidence Not Available | NOT TESTED | Medium |
| TC-07 | Error Handling | POST /api/v1/audio | Unavailable video | Private or deleted URL | Controlled error response | Evidence Not Available | NOT TESTED | High |
| TC-08 | Swagger | GET /api/v1/docs | Documentation access | Browser request | Swagger UI loads | Evidence Not Available | NOT TESTED | Medium |
| TC-09 | HTTP Responses | POST /api/v1/audio | Response validation | Valid and invalid cases | Correct HTTP status codes | Evidence Not Available | NOT TESTED | High |

## Notes

These test cases reflect the implemented backend workflow and should be executed in a real environment before release sign-off.
