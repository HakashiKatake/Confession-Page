// Import Firebase modules
import { auth, database, signInAnonymously, onAuthStateChanged, ref, push, serverTimestamp } from './firebase-config.js';

// Global variables
let currentUser = null;

// Post duration in milliseconds (24 hours)
const POST_DURATION = 24 * 60 * 60 * 1000;

// Content moderation - banned keywords
const BANNED_KEYWORDS = [
    'spam', 'scam', 'fraud', 'hate', 'violence', 'bullying', 'harassment',
    'abuse', 'discrimination', 'threat', 'illegal', 'explicit', 'nsfw',
    'offensive', 'inappropriate', 'drugs', 'alcohol', 'gambling'
];

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeAuth();
    setupFormHandler();
    setupThemeToggle();
    initializeTheme();
});

// Setup form submission
function setupFormHandler() {
    const form = document.getElementById('postForm');
    const titleInput = document.getElementById('postTitle');
    const contentInput = document.getElementById('postContent');
    
    // Auto-resize textarea
    contentInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    
    // Form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        createPost();
    });
}

// Setup theme toggle
function setupThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    
    themeToggle.addEventListener('click', function() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Update icon
        const icon = themeToggle.querySelector('i');
        icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    });
}

// Initialize theme from localStorage (default to dark)
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const themeToggle = document.getElementById('themeToggle');
    const icon = themeToggle.querySelector('i');
    icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// Check content for banned keywords
function moderateContent(title, content) {
    const text = (title + ' ' + content).toLowerCase();
    
    for (const keyword of BANNED_KEYWORDS) {
        if (text.includes(keyword.toLowerCase())) {
            return {
                allowed: false,
                reason: `Content contains inappropriate language. Please revise your post.`
            };
        }
    }
    
    return { allowed: true };
}

// Initialize Firebase Authentication
function initializeAuth() {
    updateAuthStatus('Connecting...');
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            updateAuthStatus('Connected anonymously', true);
            console.log('User signed in anonymously:', user.uid);
        } else {
            // Sign in anonymously
            updateAuthStatus('Signing in...');
            signInAnonymously(auth)
                .then((result) => {
                    currentUser = result.user;
                    updateAuthStatus('Connected anonymously', true);
                    console.log('Signed in anonymously:', result.user.uid);
                })
                .catch((error) => {
                    console.error('Anonymous auth failed:', error);
                    updateAuthStatus('Connection failed');
                });
        }
    });
}

// Update auth status display
function updateAuthStatus(status, isConnected = false) {
    const authStatus = document.getElementById('authStatus');
    if (authStatus) {
        const statusText = authStatus.querySelector('span');
        const statusIcon = authStatus.querySelector('i');
        
        if (statusText) {
            statusText.textContent = status;
        } else {
            authStatus.innerHTML = `<i class="fas fa-circle"></i><span>${status}</span>`;
        }
        
        if (isConnected) {
            authStatus.classList.add('connected');
            const icon = authStatus.querySelector('i');
            if (icon) icon.className = 'fas fa-check-circle';
        } else {
            authStatus.classList.remove('connected');
            const icon = authStatus.querySelector('i');
            if (icon) icon.className = 'fas fa-circle';
        }
    }
}

// Create a new post
function createPost() {
    const title = document.getElementById('postTitle').value.trim();
    const content = document.getElementById('postContent').value.trim();
    const category = document.getElementById('postCategory').value;
    
    if (!title || !content || !category) {
        alert('Please fill in all fields including category');
        return;
    }
    
    // Content moderation check
    const moderationResult = moderateContent(title, content);
    if (!moderationResult.allowed) {
        alert(moderationResult.reason);
        return;
    }
    
    if (!currentUser) {
        alert('Please wait for authentication...');
        return;
    }
    
    // Create post in Firebase
    createPostFirebase(title, content, category);
}

// Create post in Firebase Realtime Database
async function createPostFirebase(title, content, category) {
    try {
        // Add loading state
        const submitBtn = document.getElementById('submitBtn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<div class="loading"></div> Posting...';
        submitBtn.disabled = true;
        
        const post = {
            title: title.substring(0, 100), // Enforce max length
            content: content.substring(0, 500), // Enforce max length
            category: category,
            timestamp: Date.now(),
            expiresAt: Date.now() + POST_DURATION,
            anonymousUserId: currentUser.uid,
            isActive: true,
            likes: 0,
            likedBy: {},
            reports: []
        };
        
        console.log('Creating post in Firebase:', post);
        
        const postsRef = ref(database, 'posts');
        await push(postsRef, post);
        
        console.log('Post created successfully');
        
        // Success animation
        submitBtn.innerHTML = '✅ Posted Successfully!';
        submitBtn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
        submitBtn.classList.add('success-animation');
        
        setTimeout(() => {
            // Redirect to home page
            window.location.href = './';
        }, 2000);
        
    } catch (error) {
        console.error('Error creating post:', error);
        
        // Error state
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.innerHTML = '❌ Failed to post';
        submitBtn.style.background = 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)';
        
        setTimeout(() => {
            submitBtn.innerHTML = 'Post';
            submitBtn.style.background = '';
            submitBtn.disabled = false;
        }, 3000);
        
        alert('Failed to create post. Please check your connection and try again.');
    }
}