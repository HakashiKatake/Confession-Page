require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/campus_board';
let db;

MongoClient.connect(MONGODB_URI)
  .then(client => {
    console.log('Connected to MongoDB');
    db = client.db('campus_board');
    
    // Create TTL index for auto-expiration
    db.collection('posts').createIndex(
      { "expiresAt": 1 }, 
      { expireAfterSeconds: 0 }
    );
    
    // Create other indexes
    db.collection('posts').createIndex({ "isActive": 1, "timestamp": -1 });
    db.collection('posts').createIndex({ "anonymousUserId": 1 });
  })
  .catch(error => console.error('MongoDB connection error:', error));

// Routes

// Get all active posts
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await db.collection('posts')
      .find({ isActive: true })
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();
    
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Create new post
app.post('/api/posts', async (req, res) => {
  try {
    const { title, content, anonymousUserId } = req.body;
    
    if (!title || !content || !anonymousUserId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const post = {
      postId: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: title.substring(0, 100),
      content: content.substring(0, 500),
      timestamp: Date.now(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      anonymousUserId,
      isActive: true,
      engagement: {
        views: 0,
        reports: 0
      },
      location: {
        building: "unknown",
        campus: "main"
      }
    };
    
    const result = await db.collection('posts').insertOne(post);
    
    // Update analytics
    await updateAnalytics();
    
    res.status(201).json({ ...post, _id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Delete post
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { anonymousUserId } = req.body;
    
    const result = await db.collection('posts').deleteOne({
      _id: new require('mongodb').ObjectId(id),
      anonymousUserId // Only allow deletion by original poster
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Post not found or unauthorized' });
    }
    
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Get analytics
app.get('/api/analytics', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const analytics = await db.collection('analytics')
      .findOne({ date: today });
    
    if (!analytics) {
      // Generate analytics for today
      const newAnalytics = await generateDailyAnalytics();
      res.json(newAnalytics);
    } else {
      res.json(analytics);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Helper function to update analytics
async function updateAnalytics() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const totalPosts = await db.collection('posts').countDocuments({});
  const activePosts = await db.collection('posts').countDocuments({ isActive: true });
  const expiredPosts = totalPosts - activePosts;
  
  await db.collection('analytics').updateOne(
    { date: today },
    {
      $set: {
        metrics: {
          totalPosts,
          activePosts,
          expiredPosts,
          lastUpdated: new Date()
        }
      }
    },
    { upsert: true }
  );
}

async function generateDailyAnalytics() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const totalPosts = await db.collection('posts').countDocuments({});
  const activePosts = await db.collection('posts').countDocuments({ isActive: true });
  
  const analytics = {
    date: today,
    metrics: {
      totalPosts,
      activePosts,
      expiredPosts: totalPosts - activePosts,
      uniqueUsers: await db.collection('posts').distinct('anonymousUserId').then(users => users.length)
    }
  };
  
  await db.collection('analytics').insertOne(analytics);
  return analytics;
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});