# Campus Anonymous Posting Board

A NoSQL-powered anonymous posting board where campus users can share thoughts and posts auto-delete after 24 hours. Built with MongoDB, Firebase Auth, Realtime Database, and Hosting.

# Project Link
https://confessions-1049a.web.app/
hosted on Firebase Hosting

## Features

- **Anonymous Authentication**: Firebase Auth for session management
- **Auto-Delete**: Posts automatically expire after 24 hours using MongoDB TTL
- **CRUD Operations**: Full Create, Read, Update, Delete with MongoDB
- **Real-time Updates**: Live post updates via Firebase Realtime Database
- **NoSQL Schema**: Properly designed MongoDB collections with indexing
- **Responsive Design**: Works on mobile and desktop
- **Firebase Hosting**: Deployed and accessible online

## File Structure

```
nosql-assignment/
├── index.html              # Main HTML file
├── style.css               # CSS styling
├── script.js               # Frontend JavaScript
├── firebase-config.js      # Firebase configuration
├── backend/
│   ├── server.js           # Node.js + MongoDB backend
│   ├── models/
│   │   └── Post.js         # MongoDB post model
│   └── routes/
│       └── posts.js        # API routes
├── firebase.json           # Firebase hosting config
├── package.json            # Project dependencies
├── SCHEMA.md              # MongoDB schema documentation
└── README.md              # This file
```

## MongoDB Schema Design

### Collections Overview:

1. **Posts Collection** (`posts`)
2. **Anonymous Users Collection** (`anonymous_users`) 
3. **Campus Config Collection** (`campus_config`)
4. **Analytics Collection** (`analytics`)

### Sample Post Document:
```json
{
  "_id": ObjectId("64f8b2a1e4b0c1234567890a"),
  "postId": "1726502400000_abc123",
  "title": "Campus WiFi Issues",
  "content": "Anyone else having trouble with WiFi in the library today?",
  "timestamp": 1726502400000,
  "expiresAt": ISODate("2025-09-17T16:00:00.000Z"),
  "anonymousUserId": "anon_1726502400_xyz789",
  "tags": ["campus", "wifi", "library"],
  "isActive": true,
  "engagement": {
    "views": 23,
    "reports": 0
  },
  "location": {
    "building": "library",
    "campus": "main"
  }
}
```

### Schema Design Decisions:

- **Denormalization**: Embedded engagement metrics and location data for faster reads
- **TTL Indexes**: Automatic expiration using MongoDB's TTL feature
- **Sharding Strategy**: Campus + timestamp for horizontal scaling
- **Change Streams**: Real-time updates for live notifications

For detailed schema documentation, see [SCHEMA.md](./SCHEMA.md).

## How to Run

### Development Setup:
1. Install dependencies: `npm install`
2. Set up MongoDB Atlas or local MongoDB instance
3. Configure Firebase project and update config
4. Start backend: `npm run server`
5. Start frontend: `npm run dev`

### Firebase Deployment:
1. Build project: `npm run build`
2. Deploy: `firebase deploy`
3. Access live site: `https://your-project.web.app`

### Firebase config

1. Get your config from firebase and put it in a `firebase.config.js`

```
// Firebase configuration - replace these values with your actual Firebase config
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: ""
};


import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.3.0/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.3.0/firebase-auth.js';
import { getDatabase, ref, push, onValue, remove, update, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.3.0/firebase-database.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

export { auth, database, signInAnonymously, onAuthStateChanged, ref, push, onValue, remove, update, serverTimestamp };

```

### Local Testing:
For quick testing without backend:
1. Open `index.html` directly in browser
2. Uses localStorage simulation mode

## CRUD Operations

- **Create**: Use the form to add new anonymous posts
- **Read**: All posts are displayed automatically
- **Delete**: Manual delete button for each post
- **Auto-Delete**: Posts expire after 24 hours automatically

## Technical Implementation

### Backend Architecture:
- **MongoDB Atlas**: Cloud database with TTL indexes
- **Node.js/Express**: RESTful API backend
- **Firebase Auth**: Anonymous authentication
- **Firebase Realtime DB**: Live updates and notifications
- **Firebase Hosting**: Static site deployment

### Frontend:
- **Vanilla JavaScript**: Lightweight client-side code
- **Firebase SDK**: Auth and Realtime DB integration
- **Responsive CSS**: Mobile-first design

### Key Features:
- **Auto-expiration**: MongoDB TTL indexes handle cleanup
- **Real-time sync**: Firebase Realtime DB for live updates
- **Anonymous sessions**: Firebase Auth without personal data
- **XSS protection**: Input sanitization and validation
- **Rate limiting**: Prevent spam and abuse

## For Assignment

This prototype demonstrates:

### Phase 3 - Data Model & Explanation:
- **NoSQL Schema Design**: 4 MongoDB collections with proper indexing
- **Denormalization Strategy**: Embedded documents for performance
- **TTL Implementation**: Automatic data expiration
- **Sharding Considerations**: Campus-based horizontal scaling
- **Sample JSON Documents**: Real-world data examples

### Phase 4 - Prototype Functionality:
- **Firebase Auth**: Anonymous authentication system
- **MongoDB CRUD**: Full database operations
- **Firebase Realtime DB**: Live post updates
- **Firebase Hosting**: Production deployment
- **Dashboard Metrics**: Usage analytics and reporting

### NoSQL Design Principles:
- **Document-oriented**: JSON-like data structures
- **Horizontal scaling**: Sharding strategy defined
- **Flexible schema**: Easy to adapt and extend
- **Performance optimized**: Denormalized for read-heavy workload
