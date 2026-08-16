# Journal-App Backend API

This document provides complete documentation for the Journal-App Backend API, designed specifically for frontend integration.

### What the application does
The Journal-App is a social journaling platform where users can write daily journals (public or private), connect with friends, and read their friends' public journals. The core loop encourages daily journaling by restricting access to friends' journals unless the user has written their own journal for the day.

### What the backend is responsible for
The backend provides RESTful API endpoints for:
* User registration and authentication
* Managing friend requests and friend lists
* Creating, reading, updating, and querying daily journals
* Enforcing visibility rules based on friendship status and daily journaling activity

### How authentication works
Authentication uses JSON Web Tokens (JWT). When a user successfully signs up or logs in, the backend issues a JWT. The token is returned in the JSON response and also set as an `httpOnly` cookie. The frontend is expected to store the token from the JSON response and send it in the `Authorization` header for all protected API calls.

### How users, friends, and journals are related
* **Users:** Identified by a unique MongoDB `_id` and `username`.
* **Friends:** Relationships are managed via a two-way friend request system (`pending`, `accepted`, `rejected`). Friendship is mutual.
* **Journals:** Users can write exactly one journal per day (normalized to India Standard Time). Journals can be public or private. Public journals can be seen by friends.

### Base URL Format
The API follows standard REST principles with JSON requests and responses. The base URL depends on the deployment environment. For local development:
`http://localhost:5000`

### How the frontend should communicate with the backend
All requests should use `Content-Type: application/json` where applicable. For protected routes, the frontend must attach the JWT token in the `Authorization` header as `Bearer <token>`.

---

# Complete API Summary Table

| Method | Endpoint | Auth | Purpose |
| ------ | -------- | ---- | ------- |
| POST | `/api/auth/signup` | No | Register a new user |
| POST | `/api/auth/login` | No | Log in an existing user |
| POST | `/api/auth/logout` | No | Log out the user |
| POST | `/api/friends/request` | Yes | Send a friend request |
| GET | `/api/friends/requests` | Yes | Get pending friend requests for the user |
| PATCH | `/api/friends/request/:requestId/accept` | Yes | Accept a received friend request |
| DELETE | `/api/friends/request/:requestId/reject` | Yes | Reject a received friend request |
| GET | `/api/friends/viewFriends` | Yes | Get all accepted friends |
| POST | `/api/journals/create` | Yes | Create a journal (max 1 per day) |
| PATCH | `/api/journals/today/edit` | Yes | Edit today's journal |
| GET | `/api/journals/mine` | Yes | Get all of the logged-in user's journals |
| GET | `/api/journals/today` | Yes | Get the logged-in user's today's journal |
| GET | `/api/journals/friends/today` | Yes | Get today's public journals of all friends |
| GET | `/api/journals/friends/written-today` | Yes | Get a list of friends who have written today |
| GET | `/api/journals/friend/:friendId` | Yes | Get all public journals of a specific friend |
| GET | `/api/journals/friend/:friendId/today` | Yes | Get today's public journal of a specific friend |

---

# Authentication

The Journal-App uses JWT (JSON Web Token) for authentication.

1. **How a user registers/logs in:**
   The frontend calls `/api/auth/signup` or `/api/auth/login` with `username` and `passwordHash`.
2. **How the backend returns the JWT:**
   On success, the backend returns the token in the response body inside the `token` field. It also sets an `httpOnly` cookie.
3. **Where the frontend should store/use the token:**
   The frontend should extract the `token` from the JSON response and store it securely (e.g., in Secure Storage / EncryptedSharedPreferences for mobile, or memory/local storage for web if cookie-based auth isn't fully relied upon).
4. **How to attach the token to protected requests:**
   For all authenticated requests, send the token in the `Authorization` header:
   ```http
   Authorization: Bearer <token>
   ```
   *(Note: the backend will also check for the cookie if the header is absent, but sending the header is strongly recommended).*
5. **What happens when the token is missing:**
   The server responds with HTTP 400 and `{"message": "no token found, access denied"}`.
6. **What happens when the token is invalid/expired:**
   The server responds with HTTP 401 and `{"message": "not authorised", "err": "..."}`.
7. **Extracted Information:**
   The backend decodes the token and extracts `userId` (the MongoDB `_id` of the user) and makes it available internally. The frontend does not need to send its own user ID for protected actions.

---

# Recommended Frontend Flow

```text
1. Register/Login (/api/auth/signup or /api/auth/login)
      ↓
2. Receive JWT & Store authentication state securely
      ↓
3. Navigate to Home Dashboard
      ↓
4. Check if user wrote today's journal (/api/journals/today)
      ↓
5. If not written:
      → Show prompt to create today's journal (/api/journals/create)
   If written:
      → Show today's journal with option to edit (/api/journals/today/edit)
      → Unlock friends' journals (/api/journals/friends/today)
      → View who wrote today (/api/journals/friends/written-today)
      ↓
6. Manage Friends:
      → Send friend requests (/api/friends/request)
      → View incoming requests (/api/friends/requests)
      → Accept/Reject requests
      → View Friends list (/api/friends/viewFriends)
      ↓
7. View Friend Profiles:
      → See friend's public history (/api/journals/friend/:friendId)
```

---

# Journal Visibility Rules

Understanding who can see what is critical for this application.

* **Who can see a private journal?**
  Only the owner can see their private journals.
* **Who can see a public journal?**
  The owner and their accepted friends.
* **Can strangers see public journals?**
  No. A user can only see public journals of users they are explicitly friends with.
* **Can friends see private journals?**
  No. Private journals are strictly for the owner.
* **Can the owner always see their own journal?**
  Yes. Users can fetch all their own journals via `/api/journals/mine` and `/api/journals/today`.
* **What happens when two users are not friends?**
  They cannot see each other's journals. The backend will return a `403` error if they try.
* **What happens when a friend relationship is pending or rejected?**
  Treated the same as "not friends". Access is blocked.
* **Are journals restricted by date?**
  Yes. To view friends' *today* journals, the logged-in user **must have written their own journal for today**. If they haven't, the backend returns a `403` error.
* **Can a user create multiple journals on the same day?**
  No. The backend enforces a strict 1 journal per user per day rule. Trying to create a second one returns a `409 Conflict`.
* **How is the journal date interpreted?**
  The backend normalizes all journal dates to **midnight India Standard Time (IST)**. Even if you submit a timestamp from another timezone, the backend shifts it to the start of the current IST day.
* **Is the date handled using IST?**
  Yes. The backend uses `getStartOfISTDay()`. "Today" always means today in IST (+05:30).
* **What happens if `journalDate` is omitted when creating?**
  The backend automatically uses the current server time and normalizes it to midnight IST. The frontend rarely needs to send a date manually.

---

# Friend System

The system operates on mutual friend requests.
Relationships involve two user IDs (`senderId` and `receiverId`) and a `status` (`pending`, `accepted`, `rejected`).

**Flow:**
```text
No relationship
      ↓
Pending (Request sent via /api/friends/request)
      ↓
Accepted (Receiver calls /api/friends/request/:requestId/accept)
      or
Rejected (Receiver calls /api/friends/request/:requestId/reject)
```

**Notes:**
* There is no backend endpoint to cancel a sent request or remove an already accepted friend. (Frontend should not assume these features exist).
* Users cannot send a request to themselves.
* Users cannot send a request if one is already pending in either direction.

---

# Journal API Documentation

Journals hold the daily thoughts of users.

### Journal Object Schema
When the backend returns a journal, it looks like this:

| Field         | Type    | Meaning                          |
| ------------- | ------- | -------------------------------- |
| `_id`         | string  | MongoDB unique journal ID        |
| `userId`      | string/object| Owner's user ID (sometimes populated with `username`) |
| `content`     | string  | Journal content                  |
| `isPublic`    | boolean | Whether the journal is public    |
| `journalDate` | date string | ISO 8601 Date associated with the journal (Midnight IST) |
| `createdAt`   | date string | When the record was created |
| `updatedAt`   | date string | When the record was last modified |

---

# 3. API Endpoint Documentation

## METHOD `POST /api/auth/signup`

### Purpose
Registers a new user in the system and returns a JWT token for immediate login.

### Authentication
Not required.

### Request Headers
```http
Content-Type: application/json
```

### Request Body
| Field        | Type   | Required | Description |
| ------------ | ------ | -------- | ----------- |
| username     | string | Yes      | User's unique username |
| passwordHash | string | Yes      | User's password (must be >= 6 characters) |

### Example Request
```http
POST /api/auth/signup
Content-Type: application/json
```
```json
{
  "username": "rajdeep",
  "passwordHash": "password123"
}
```

### Success Response
HTTP 200
```json
{
  "message": "signup successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR...",
  "user": {
    "userId": "6618d32e7658010afe7768a1",
    "username": "rajdeep"
  }
}
```

### Error Responses
HTTP 400
```json
{
  "message": "all fields are not present",
  "errorCode": 400
}
```
HTTP 400
```json
{
  "message": "password muxt not be less than 6 charecters",
  "errorCode": 400
}
```
HTTP 409
```json
{
  "message": "userName already exist",
  "errorCode": 400
}
```

---

## METHOD `POST /api/auth/login`

### Purpose
Authenticates an existing user and returns a JWT token.

### Authentication
Not required.

### Request Headers
```http
Content-Type: application/json
```

### Request Body
| Field        | Type   | Required | Description |
| ------------ | ------ | -------- | ----------- |
| username     | string | Yes      | User's username |
| passwordHash | string | Yes      | User's password |

### Example Request
```http
POST /api/auth/login
Content-Type: application/json
```
```json
{
  "username": "rajdeep",
  "passwordHash": "password123"
}
```

### Success Response
HTTP 200
*(Note: The backend currently hardcodes properties like name, email, role in the response which may be undefined based on the User model schema)*
```json
{
  "message": "logged in successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR...",
  "user": {
    "userId": "6618d32e7658010afe7768a1"
  }
}
```

### Error Responses
HTTP 400
```json
{
  "message": "all fields not present",
  "statusCode": 400
}
```
HTTP 400
```json
{
  "message": "user not registered",
  "statusCode": 400
}
```
HTTP 400
```json
{
  "message": "incorrect password",
  "statusCode": 400
}
```

---

## METHOD `POST /api/auth/logout`

### Purpose
Logs out the user by clearing the HTTP-only cookie. (For frontend implementations heavily relying on local JWT storage, the frontend must also delete the token locally).

### Authentication
Not required.

### Request Headers
```http
Content-Type: application/json
```

### Request Body
None

### Example Request
```http
POST /api/auth/logout
Content-Type: application/json
```

### Success Response
HTTP 200
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## METHOD `POST /api/friends/request`

### Purpose
Sends a friend request to another user.

### Authentication
Required.

### Request Headers
```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
```

### Request Body
| Field      | Type   | Required | Description |
| ---------- | ------ | -------- | ----------- |
| receiverId | string | Yes      | MongoDB `_id` of the user to send the request to |

### Example Request
```http
POST /api/friends/request
Content-Type: application/json
Authorization: Bearer eyJhb...
```
```json
{
  "receiverId": "6618d35f7658010afe7768b5"
}
```

### Success Response
HTTP 201
```json
{
  "message": "Friend request sent",
  "friendRequest": {
    "senderId": "6618d32e7658010afe7768a1",
    "receiverId": "6618d35f7658010afe7768b5",
    "status": "pending",
    "_id": "6619a1b245cd901bcda901ab",
    "createdAt": "2024-04-12T10:00:00.000Z",
    "updatedAt": "2024-04-12T10:00:00.000Z"
  }
}
```

### Error Responses
HTTP 400
```json
{
  "message": "receiverId is required"
}
```
HTTP 400
```json
{
  "message": "You cannot send a friend request to yourself"
}
```
HTTP 404
```json
{
  "message": "User not found"
}
```
HTTP 409
```json
{
  "message": "You are already friends"
}
```
HTTP 409
```json
{
  "message": "Friend request already exists"
}
```

---

## METHOD `GET /api/friends/requests`

### Purpose
Fetches all pending friend requests received by the logged-in user.

### Authentication
Required.

### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
```

### Request Body
None

### Example Request
```http
GET /api/friends/requests
Authorization: Bearer eyJhb...
```

### Success Response
HTTP 200
```json
{
  "count": 1,
  "requests": [
    {
      "_id": "6619a1b245cd901bcda901ab",
      "senderId": {
        "_id": "6618d35f7658010afe7768b5",
        "username": "nitish"
      },
      "receiverId": "6618d32e7658010afe7768a1",
      "status": "pending",
      "createdAt": "2024-04-12T10:00:00.000Z",
      "updatedAt": "2024-04-12T10:00:00.000Z"
    }
  ]
}
```

---

## METHOD `PATCH /api/friends/request/:requestId/accept`

### Purpose
Accepts a pending friend request.

### Authentication
Required.

### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
```

### Request Body
None

### Example Request
```http
PATCH /api/friends/request/6619a1b245cd901bcda901ab/accept
Authorization: Bearer eyJhb...
```

### Success Response
HTTP 200
```json
{
  "message": "Friend request accepted",
  "friendRequest": {
    "_id": "6619a1b245cd901bcda901ab",
    "senderId": "6618d35f7658010afe7768b5",
    "receiverId": "6618d32e7658010afe7768a1",
    "status": "accepted"
  }
}
```

### Error Responses
HTTP 404
```json
{
  "message": "Friend request not found"
}
```

---

## METHOD `DELETE /api/friends/request/:requestId/reject`

### Purpose
Rejects a pending friend request by deleting the request record entirely.

### Authentication
Required.

### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
```

### Request Body
None

### Example Request
```http
DELETE /api/friends/request/6619a1b245cd901bcda901ab/reject
Authorization: Bearer eyJhb...
```

### Success Response
HTTP 200
```json
{
  "message": "Friend request rejected"
}
```

### Error Responses
HTTP 404
```json
{
  "message": "Friend request not found"
}
```

---

## METHOD `GET /api/friends/viewFriends`

### Purpose
Fetches a list of all accepted friends for the logged-in user.

### Authentication
Required.

### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
```

### Request Body
None

### Example Request
```http
GET /api/friends/viewFriends
Authorization: Bearer eyJhb...
```

### Success Response
HTTP 200
```json
{
  "count": 1,
  "friends": [
    {
      "_id": "6618d35f7658010afe7768b5",
      "username": "nitish"
    }
  ]
}
```

---

## METHOD `POST /api/journals/create`

### Purpose
Creates a new journal entry for the user. A user can only create one journal per day (enforced using normalized IST midnight dates).

### Authentication
Required.

### Request Headers
```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
```

### Request Body
| Field       | Type    | Required | Description |
| ----------- | ------- | -------- | ----------- |
| content     | string  | Yes      | Text content of the journal |
| isPublic    | boolean | No       | Whether friends can see it. Default: `true` |
| journalDate | string  | No       | Custom date string. Default is current date. Safest to omit. |

### Example Request
```http
POST /api/journals/create
Content-Type: application/json
Authorization: Bearer eyJhb...
```
```json
{
  "content": "Today was a great day learning about backend APIs!",
  "isPublic": true
}
```

### Success Response
HTTP 201
```json
{
  "message": "Journal created successfully",
  "journal": {
    "userId": "6618d32e7658010afe7768a1",
    "content": "Today was a great day learning about backend APIs!",
    "isPublic": true,
    "journalDate": "2024-04-11T18:30:00.000Z",
    "_id": "6619b2c345cd901bcda902cd",
    "createdAt": "2024-04-12T10:05:00.000Z",
    "updatedAt": "2024-04-12T10:05:00.000Z"
  }
}
```

### Error Responses
HTTP 400
```json
{
  "message": "Journal content is required"
}
```
HTTP 409
```json
{
  "message": "You already have a journal for this day"
}
```

---

## METHOD `PATCH /api/journals/today/edit`

### Purpose
Edits the content or visibility of the user's journal for the current IST day.

### Authentication
Required.

### Request Headers
```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
```

### Request Body
| Field    | Type    | Required | Description |
| -------- | ------- | -------- | ----------- |
| content  | string  | No       | Updated text content |
| isPublic | boolean | No       | Updated visibility |

*(At least one field should be provided)*

### Example Request
```http
PATCH /api/journals/today/edit
Content-Type: application/json
Authorization: Bearer eyJhb...
```
```json
{
  "content": "Updated: Today was a great day!",
  "isPublic": false
}
```

### Success Response
HTTP 200
```json
{
  "message": "Today's journal updated successfully",
  "journal": {
    "_id": "6619b2c345cd901bcda902cd",
    "userId": "6618d32e7658010afe7768a1",
    "content": "Updated: Today was a great day!",
    "isPublic": false,
    "journalDate": "2024-04-11T18:30:00.000Z"
  }
}
```

### Error Responses
HTTP 400
```json
{
  "message": "Journal content cannot be empty"
}
```
HTTP 404
```json
{
  "message": "You don't have a journal for today"
}
```

---

## METHOD `GET /api/journals/mine`

### Purpose
Fetches all journals created by the logged-in user, sorted newest to oldest.

### Authentication
Required.

### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
```

### Request Body
None

### Example Request
```http
GET /api/journals/mine
Authorization: Bearer eyJhb...
```

### Success Response
HTTP 200
```json
{
  "message": "Journals fetched successfully",
  "journals": [
    {
      "_id": "6619b2c345cd901bcda902cd",
      "userId": "6618d32e7658010afe7768a1",
      "content": "Today was a great day!",
      "isPublic": false,
      "journalDate": "2024-04-11T18:30:00.000Z"
    }
  ]
}
```

---

## METHOD `GET /api/journals/today`

### Purpose
Fetches the logged-in user's journal entry for the current day (IST).

### Authentication
Required.

### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
```

### Request Body
None

### Example Request
```http
GET /api/journals/today
Authorization: Bearer eyJhb...
```

### Success Response
HTTP 200
```json
{
  "message": "Today's journal fetched successfully",
  "journal": {
    "_id": "6619b2c345cd901bcda902cd",
    "userId": "6618d32e7658010afe7768a1",
    "content": "Today was a great day!",
    "isPublic": false,
    "journalDate": "2024-04-11T18:30:00.000Z"
  }
}
```

### Error Responses
HTTP 404
```json
{
  "message": "You don't have a journal for today"
}
```

---

## METHOD `GET /api/journals/friends/today`

### Purpose
Fetches today's public journals of all accepted friends. **Gated:** The user must have written their own journal today.

### Authentication
Required.

### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
```

### Request Body
None

### Example Request
```http
GET /api/journals/friends/today
Authorization: Bearer eyJhb...
```

### Success Response
HTTP 200
```json
{
  "message": "Friends' today journals fetched successfully",
  "journals": [
    {
      "_id": "6619c3d456de012cdeb013de",
      "userId": {
        "_id": "6618d35f7658010afe7768b5",
        "username": "nitish"
      },
      "content": "Had an amazing coding session today.",
      "isPublic": true,
      "journalDate": "2024-04-11T18:30:00.000Z"
    }
  ]
}
```

### Error Responses
HTTP 403
```json
{
  "message": "Write today's journal to unlock your friends' entries"
}
```

---

## METHOD `GET /api/journals/friends/written-today`

### Purpose
Returns a list of friends who have written a journal today. Does not return the content. **Gated:** The user must have written their own journal today.

### Authentication
Required.

### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
```

### Request Body
None

### Example Request
```http
GET /api/journals/friends/written-today
Authorization: Bearer eyJhb...
```

### Success Response
HTTP 200
```json
{
  "message": "Friends who wrote today fetched successfully",
  "friendsWrittenToday": [
    {
      "userId": "6618d35f7658010afe7768b5",
      "username": "nitish",
      "isPublic": true
    }
  ]
}
```

### Error Responses
HTTP 403
```json
{
  "message": "Write today's journal to unlock this list"
}
```

---

## METHOD `GET /api/journals/friend/:friendId`

### Purpose
Fetches all public journals of a specific friend, sorted newest to oldest.

### Authentication
Required.

### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
```

### Request Body
None

### Example Request
```http
GET /api/journals/friend/6618d35f7658010afe7768b5
Authorization: Bearer eyJhb...
```

### Success Response
HTTP 200
```json
{
  "message": "Friend's journals fetched successfully",
  "journals": [
    {
      "_id": "6619c3d456de012cdeb013de",
      "userId": "6618d35f7658010afe7768b5",
      "content": "Had an amazing coding session today.",
      "isPublic": true,
      "journalDate": "2024-04-11T18:30:00.000Z"
    }
  ]
}
```

### Error Responses
HTTP 403
```json
{
  "message": "You are not friends with this user"
}
```

---

## METHOD `GET /api/journals/friend/:friendId/today`

### Purpose
Fetches a specific friend's today's public journal. **Gated:** The user must have written their own journal today.

### Authentication
Required.

### Request Headers
```http
Authorization: Bearer <JWT_TOKEN>
```

### Request Body
None

### Example Request
```http
GET /api/journals/friend/6618d35f7658010afe7768b5/today
Authorization: Bearer eyJhb...
```

### Success Response
HTTP 200
```json
{
  "message": "Friend's today journal fetched successfully",
  "journal": {
    "_id": "6619c3d456de012cdeb013de",
    "userId": "6618d35f7658010afe7768b5",
    "content": "Had an amazing coding session today.",
    "isPublic": true,
    "journalDate": "2024-04-11T18:30:00.000Z"
  }
}
```

### Error Responses
HTTP 403
```json
{
  "message": "You are not friends with this user"
}
```
HTTP 403
```json
{
  "message": "Write today's journal to unlock your friends' entries"
}
```
HTTP 404
```json
{
  "message": "This friend hasn't posted a public journal today"
}
```

---

# Frontend Quick Reference

### Base URL
```text
http://localhost:5000
```
*(Depends on environment variables, typically port 5000)*

### Authentication Header
```http
Authorization: Bearer <JWT_TOKEN>
```

### Common Content Type
```http
Content-Type: application/json
```

### Important IDs
* **`userId`**: The frontend receives the logged-in user's ID at login/signup. Store this, as you'll need to know who the logged-in user is when rendering lists.
* **`friendId`**: Found in the `friends` list or `requests` array. Used heavily in `/api/journals/friend/:friendId`.
* **`requestId`**: Found inside pending request objects. Used for accepting/rejecting friend requests.

### Common Errors

| Status | Meaning | Frontend Action |
| ------ | ------- | --------------- |
| 400 | Bad request / Validation failed | Check the request body payload |
| 401 | Unauthorized | Token expired/missing. Redirect to login screen |
| 403 | Forbidden | Access denied. E.g., trying to read friend journals without writing yours first |
| 404 | Not found | Resource doesn't exist. E.g., user hasn't written a journal today |
| 409 | Conflict | State conflict. E.g., User already exists, or already wrote a journal today |
| 500 | Server error | Show a generic "Something went wrong" message |
