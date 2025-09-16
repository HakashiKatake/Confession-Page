# Firebase Realtime Database Schema Design for Campus Anonymous Board

## Schema Overview

Our NoSQL schema is designed for an anonymous confession posting board with real-time updates, auto-expiring posts, and comprehensive moderation features. The design prioritizes simplicity, performance, and scalability while maintaining complete anonymity.

## Database Structure

### 1. Posts Collection (`posts`)

**Purpose**: Store all anonymous confessions with auto-expiration, categories, and engagement metrics

```json
{
  "posts": {
    "postId_12345": {
      "title": "Campus WiFi Issues in Library",
      "content": "Anyone else having trouble with WiFi in the library today? It's been really slow all morning.",
      "category": "academic",
      "timestamp": 1726502400000,
      "expiresAt": 1726588800000,
      "anonymousUserId": "anon_user_xyz789",
      "isActive": true,
      "likes": 15,
      "likedBy": {
        "anon_user_abc123": true,
        "anon_user_def456": true
      },
      "reports": {
        "report_id_1": {
          "reportedBy": "anon_user_ghi789",
          "reason": "Spam",
          "timestamp": 1726505000000,
          "status": "pending"
        }
      }
    }
  }
}
```

### 2. Reports Collection (`reports`)

**Purpose**: Store detailed reports for moderation with admin workflow

```json
{
  "reports": {
    "postId_12345": {
      "report_id_1": {
        "postId": "postId_12345",
        "reportedBy": "anon_user_ghi789",
        "reason": "Breaks the Content Policy",
        "timestamp": 1726505000000,
        "status": "pending",
        "adminAction": null,
        "reviewedBy": null,
        "reviewedAt": null
      },
      "report_id_2": {
        "postId": "postId_12345",
        "reportedBy": "anon_user_jkl012",
        "reason": "Harassment",
        "timestamp": 1726506000000,
        "status": "resolved",
        "adminAction": "dismissed",
        "reviewedBy": "admin_user_1",
        "reviewedAt": 1726520000000
      }
    }
  }
}
```

### 3. User Preferences Collection (`userPreferences`)

**Purpose**: Store anonymous user preferences and session data

```json
{
  "userPreferences": {
    "anon_user_xyz789": {
      "theme": "dark",
      "lastActive": 1726502400000,
      "postCount": 3,
      "sessionStart": 1726500000000,
      "isBlocked": false,
      "deviceFingerprint": "hash_device_info_123"
    }
  }
}
```

### 4. Admin Configuration (`adminConfig`)

**Purpose**: Store application settings and moderation rules

```json
{
  "adminConfig": {
    "postSettings": {
      "postExpiryHours": 24,
      "maxPostsPerUser": 10,
      "maxPostLength": 500,
      "maxTitleLength": 100,
      "moderationEnabled": true,
      "autoModeration": true
    },
    "categories": {
      "academic": { "name": "Academic", "icon": "fas fa-book", "enabled": true },
      "social": { "name": "Social", "icon": "fas fa-users", "enabled": true },
      "events": { "name": "Events", "icon": "fas fa-calendar-alt", "enabled": true },
      "campus-life": { "name": "Campus Life", "icon": "fas fa-university", "enabled": true },
      "food": { "name": "Food & Dining", "icon": "fas fa-utensils", "enabled": true },
      "housing": { "name": "Housing", "icon": "fas fa-home", "enabled": true },
      "technology": { "name": "Technology", "icon": "fas fa-laptop", "enabled": true },
      "sports": { "name": "Sports", "icon": "fas fa-futbol", "enabled": true },
      "clubs": { "name": "Clubs & Organizations", "icon": "fas fa-theater-masks", "enabled": true },
      "general": { "name": "General Discussion", "icon": "fas fa-comment", "enabled": true }
    },
    "bannedWords": ["spam", "inappropriate", "offensive"],
    "reportReasons": [
      "Breaks the Content Policy",
      "Harassment",
      "Threatening violence",
      "Spam",
      "Sharing personal information",
      "Impersonation",
      "Prohibited transaction"
    ]
  }
}
```

## Schema Design Decisions

### 1. Firebase Realtime Database Structure

**Denormalized Data Approach:**
- ✅ **Posts self-contained**: All engagement metrics embedded (likes, reports)
- ✅ **Real-time updates**: Firebase listeners for live post updates
- ✅ **Category system**: Embedded category data for fast filtering
- ✅ **Anonymous user tracking**: Session-based without personal data

**Reasoning**: Real-time anonymous confession board benefits from denormalized structure for instant updates and fast reads.

### 2. Security Rules Strategy

```javascript
// Firebase Security Rules
{
  "rules": {
    "posts": {
      ".read": true,
      ".write": "auth != null",
      "$postId": {
        ".validate": "newData.hasChildren(['title', 'content', 'category', 'timestamp', 'anonymousUserId'])",
        "title": {
          ".validate": "newData.isString() && newData.val().length <= 100"
        },
        "content": {
          ".validate": "newData.isString() && newData.val().length <= 500"
        },
        "category": {
          ".validate": "newData.isString()"
        },
        "likes": {
          ".validate": "newData.isNumber() && newData.val() >= 0"
        },
        "likedBy": {
          "$userId": {
            ".validate": "newData.isBoolean()"
          }
        }
      }
    },
    "reports": {
      ".read": "auth != null",
      ".write": "auth != null",
      "$postId": {
        "$reportId": {
          ".validate": "newData.hasChildren(['postId', 'reportedBy', 'reason', 'timestamp', 'status'])"
        }
      }
    },
    "userPreferences": {
      "$userId": {
        ".read": "$userId === auth.uid",
        ".write": "$userId === auth.uid"
      }
    },
    "adminConfig": {
      ".read": true,
      ".write": false
    }
  }
}
```

### 3. Real-time Features Implementation

**Live Post Updates:**
```javascript
// Listen for new posts
const postsRef = ref(database, 'posts');
onValue(postsRef, (snapshot) => {
  // Update UI with new posts
  displayPosts(snapshot.val());
});

// Listen for like updates
onValue(ref(database, `posts/${postId}/likes`), (snapshot) => {
  updateLikeCount(snapshot.val());
});
```

**Admin Real-time Dashboard:**
```javascript
// Monitor reports in real-time
const reportsRef = ref(database, 'reports');
onValue(reportsRef, (snapshot) => {
  updateAdminDashboard(snapshot.val());
});
```

## Query Patterns

### Common Operations:

1. **Get Active Posts with Real-time Updates**:
```javascript
// Get posts sorted by timestamp (newest first)
const postsRef = ref(database, 'posts');
onValue(postsRef, (snapshot) => {
  const posts = [];
  snapshot.forEach((child) => {
    const post = child.val();
    if (post.isActive && post.expiresAt > Date.now()) {
      posts.push({ id: child.key, ...post });
    }
  });
  posts.sort((a, b) => b.timestamp - a.timestamp);
  displayPosts(posts);
});
```

2. **Filter Posts by Category**:
```javascript
// Get posts by specific category
const categoryPosts = posts.filter(post => 
  post.category === 'academic' && 
  post.isActive && 
  post.expiresAt > Date.now()
);
```

3. **Sort Posts by Popularity (Best)**:
```javascript
// Sort by likes (best posts)
const bestPosts = activePosts.sort((a, b) => 
  (b.likes || 0) - (a.likes || 0)
);
```

4. **Trending Algorithm**:
```javascript
// Trending: Recent posts with high engagement
const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000);
const trendingPosts = activePosts.sort((a, b) => {
  const aScore = a.timestamp > sixHoursAgo ? (a.likes || 0) * 2 : (a.likes || 0);
  const bScore = b.timestamp > sixHoursAgo ? (b.likes || 0) * 2 : (b.likes || 0);
  return bScore - aScore;
});
```

5. **Toggle Like Operation**:
```javascript
// Update likes atomically
async function toggleLike(postId, userId) {
  const postRef = ref(database, `posts/${postId}`);
  const snapshot = await get(postRef);
  const post = snapshot.val();
  
  const hasLiked = post.likedBy && post.likedBy[userId];
  const newLikes = hasLiked ? (post.likes || 1) - 1 : (post.likes || 0) + 1;
  
  const updates = {
    likes: Math.max(0, newLikes),
    [`likedBy/${userId}`]: hasLiked ? null : true
  };
  
  await update(postRef, updates);
}
```

6. **Submit Report**:
```javascript
// Add report to both reports collection and post
async function reportPost(postId, userId, reason) {
  const reportData = {
    postId,
    reportedBy: userId,
    reason,
    timestamp: Date.now(),
    status: 'pending'
  };
  
  // Add to reports collection
  const reportRef = ref(database, `reports/${postId}`);
  await push(reportRef, reportData);
  
  // Add to post's reports
  const postReportsRef = ref(database, `posts/${postId}/reports`);
  await push(postReportsRef, reportData);
}
```

7. **Admin Dashboard Queries**:
```javascript
// Get pending reports for admin review
const pendingReports = reports.filter(report => 
  report.status === 'pending'
);

// Get posts with multiple reports
const flaggedPosts = posts.filter(post => 
  post.reports && Object.keys(post.reports).length >= 3
);
```

This schema design supports the real-time anonymous confession board with advanced features including categorization, reporting system, like functionality, and comprehensive admin moderation tools.