// Import Firebase modules
import { auth, database, signInAnonymously, onAuthStateChanged, ref, push, onValue, remove, update, serverTimestamp } from './firebase-config.js';

// Global variables
let currentUser = null;
let posts = [];
let currentFilter = 'best'; // Changed from 'all' to 'best'
let currentSortOrder = 'best'; // New variable for sort order
let selectedCategories = ['all'];
const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api';

// Post duration in milliseconds (24 hours)
const POST_DURATION = 24 * 60 * 60 * 1000;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeAuth();
    setupFilterButtons();
    setupThemeToggle();
    initializeTheme();
    setupEventDelegation();
    setupPostPageNavigation();
    setupCategoryDropdown();
    
    // Expose functions globally for any cached onclick handlers
    setTimeout(() => {
        window.toggleLike = toggleLike;
        window.deletePost = deletePost;
        window.reportPost = reportPost;
    }, 100);
    
    // setupRealTimeSync is called after authentication
});

// Setup event delegation for dynamic content
function setupEventDelegation() {
    const postsContainer = document.getElementById('postsContainer');
    
    postsContainer.addEventListener('click', function(e) {
        const target = e.target.closest('button');
        if (!target) return;
        
        if (target.classList.contains('like-btn')) {
            const postId = target.dataset.postId;
            if (postId) {
                toggleLike(postId);
            }
        } else if (target.classList.contains('delete-btn')) {
            const postId = target.dataset.postId;
            if (postId) {
                deletePost(postId);
            }
        } else if (target.classList.contains('report-btn')) {
            const postId = target.dataset.postId;
            if (postId) {
                reportPost(postId);
            }
        }
    });
}

// Setup post page navigation
function setupPostPageNavigation() {
    const postInputField = document.getElementById('postInputField');
    const goToPostBtn = document.getElementById('goToPostPage');
    
    if (postInputField && goToPostBtn) {
        const navigateToPost = () => {
            window.location.href = './post.html';
        };
        
        postInputField.addEventListener('click', navigateToPost);
        goToPostBtn.addEventListener('click', navigateToPost);
    }
}

// Setup category dropdown
function setupCategoryDropdown() {
    const dropdownBtn = document.getElementById('categoryDropdown');
    const dropdownMenu = document.getElementById('categoryMenu');
    
    if (dropdownBtn && dropdownMenu) {
        dropdownBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function() {
            dropdownMenu.classList.remove('show');
        });
        
        // Handle checkbox changes
        const checkboxes = dropdownMenu.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                if (this.value === 'all') {
                    // If "All Categories" is checked, uncheck others
                    if (this.checked) {
                        checkboxes.forEach(cb => {
                            if (cb.value !== 'all') cb.checked = false;
                        });
                    }
                } else {
                    // If any specific category is checked, uncheck "All Categories"
                    if (this.checked) {
                        const allCheckbox = dropdownMenu.querySelector('input[value="all"]');
                        if (allCheckbox) allCheckbox.checked = false;
                    }
                }
                
                updateCategoryFilter();
            });
        });
    }
}

// Update category filter based on selected checkboxes
function updateCategoryFilter() {
    const dropdownMenu = document.getElementById('categoryMenu');
    const checkboxes = dropdownMenu.querySelectorAll('input[type="checkbox"]:checked');
    const selectedCategories = Array.from(checkboxes).map(cb => cb.value);
    
    // Update dropdown button text
    const dropdownBtn = document.getElementById('categoryDropdown');
    const btnText = dropdownBtn.querySelector('span');
    
    if (selectedCategories.includes('all') || selectedCategories.length === 0) {
        btnText.textContent = 'All Categories';
        currentFilter = 'all';
    } else if (selectedCategories.length === 1) {
        const categoryName = selectedCategories[0].charAt(0).toUpperCase() + selectedCategories[0].slice(1);
        btnText.textContent = categoryName;
        currentFilter = selectedCategories[0];
    } else {
        btnText.textContent = `${selectedCategories.length} Categories`;
        currentFilter = selectedCategories;
    }
    
    displayPosts();
}

// Setup form submission
function setupFormHandler() {
    const form = document.getElementById('postForm');
    const titleInput = document.getElementById('postTitle');
    const contentInput = document.getElementById('postContent');
    const charCount = document.getElementById('charCount');
    
    // Character counter
    contentInput.addEventListener('input', function() {
        const count = this.value.length;
        charCount.textContent = count;
        charCount.style.color = count > 450 ? '#e74c3c' : count > 400 ? '#f39c12' : '#666';
    });
    
    // Form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        createPost();
    });
    
    // Auto-resize textarea
    contentInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
}

// Setup filter buttons
function setupFilterButtons() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons in the same group
            const group = this.closest('.main-filters') || this.closest('.filter-tabs');
            if (group) {
                group.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            }
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Handle different types of filters
            if (this.dataset.filter) {
                // Main filters (best, trending, newest)
                currentSortOrder = this.dataset.filter;
            } else if (this.dataset.category) {
                // Category filters (legacy support)
                currentFilter = this.dataset.category;
            }
            
            // Update display
            displayPosts();
        });
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

// Content moderation - banned keywords
const BANNED_KEYWORDS = [
    'spam', 'scam', 'fraud', 'hate', 'violence', 'bullying', 'harassment',
    'abuse', 'discrimination', 'threat', 'illegal', 'explicit', 'nsfw',
    'offensive', 'inappropriate', 'drugs', 'alcohol', 'gambling'
];

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

// Setup real-time synchronization
function setupRealTimeSync() {
    if (!currentUser) return;
    
    console.log('Setting up Firebase Realtime Database sync...');
    const postsRef = ref(database, 'posts');
    
    onValue(postsRef, (snapshot) => {
        posts = []; // Clear existing posts
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            // Convert Firebase data to array
            Object.keys(data).forEach(key => {
                const post = {
                    id: key,
                    ...data[key]
                };
                
                // Only include non-expired posts
                const expiresAt = post.expiresAt || (post.timestamp + POST_DURATION);
                if (expiresAt > Date.now()) {
                    posts.push(post);
                }
            });
            
            // Sort by timestamp (newest first)
            posts.sort((a, b) => b.timestamp - a.timestamp);
            console.log(`Loaded ${posts.length} active posts from Firebase`);
        } else {
            console.log('No posts found in Firebase');
        }
        
        console.log('Current posts:', posts); // Debug log
        displayPosts();
    }, (error) => {
        console.error('Firebase read error:', error);
        updateAuthStatus('Firebase error - using offline mode');
        initializeOfflineMode();
    });
}

// Initialize Firebase Authentication
function initializeAuth() {
    updateAuthStatus('Connecting...');
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            updateAuthStatus('Connected anonymously', true);
            console.log('User signed in anonymously:', user.uid);
            setupRealTimeSync(); // Load posts from Firebase instead of API
        } else {
            // Sign in anonymously
            updateAuthStatus('Signing in...');
            signInAnonymously(auth)
                .then((result) => {
                    currentUser = result.user;
                    updateAuthStatus('Connected anonymously', true);
                    console.log('Signed in anonymously:', result.user.uid);
                    setupRealTimeSync(); // Load posts from Firebase instead of API
                })
                .catch((error) => {
                    console.error('Anonymous auth failed:', error);
                    updateAuthStatus('Offline mode');
                    // Fallback to localStorage mode
                    initializeOfflineMode();
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

// Fallback offline mode using localStorage
function initializeOfflineMode() {
    console.log('Running in offline mode');
    posts = JSON.parse(localStorage.getItem('campusPosts')) || [];
    displayPosts();
    setupAutoDelete();
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
    
    // Create post directly in Firebase (skip API for now)
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
            likedBy: {}
        };
        
        console.log('Creating post in Firebase:', post);
        
        const postsRef = ref(database, 'posts');
        await push(postsRef, post);
        
        console.log('Post created successfully');
        clearForm();
        
        // Success animation
        submitBtn.innerHTML = '✅ Posted Successfully!';
        submitBtn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
        submitBtn.classList.add('success-animation');
        
        setTimeout(() => {
            submitBtn.innerHTML = originalText;
            submitBtn.style.background = '';
            submitBtn.disabled = false;
            submitBtn.classList.remove('success-animation');
        }, 3000);
        
    } catch (error) {
        console.error('Error creating post:', error);
        
        // Error state
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.innerHTML = '❌ Failed to post';
        submitBtn.style.background = 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)';
        
        setTimeout(() => {
            submitBtn.innerHTML = '📢 Post Anonymously';
            submitBtn.style.background = '';
            submitBtn.disabled = false;
        }, 3000);
        
        alert('Failed to create post. Please check your connection and try again.');
    }
}

// Create post offline (localStorage)
function createPostOffline(title, content, category) {
    const post = {
        id: generateId(),
        title,
        content,
        category: category || 'general',
        timestamp: Date.now(),
        expiresAt: Date.now() + POST_DURATION,
        anonymousUserId: currentUser?.uid || 'offline_user'
    };
    
    // Try Firebase first, fallback to localStorage
    if (currentUser && database) {
        try {
            const postsRef = ref(database, 'posts');
            push(postsRef, post);
            clearForm();
            return;
        } catch (error) {
            console.error('Firebase failed, using localStorage:', error);
        }
    }
    
    // Fallback to localStorage if Firebase is not available
    posts.unshift(post);
    savePosts();
    displayPosts();
    clearForm();
}

// Generate simple ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Clear the form
function clearForm() {
    document.getElementById('postTitle').value = '';
    document.getElementById('postContent').value = '';
    document.getElementById('postCategory').value = '';
    document.getElementById('charCount').textContent = '0';
    
    // Reset textarea height
    const contentInput = document.getElementById('postContent');
    contentInput.style.height = 'auto';
}

// Display all posts
function displayPosts() {
    const container = document.getElementById('postsContainer');
    
    // Filter active posts (remove expired)
    let activePosts = posts.filter(post => {
        const expiresAt = post.expiresAt instanceof Date ? post.expiresAt.getTime() : post.expiresAt;
        return expiresAt > Date.now();
    });
    
    // Apply category filter
    if (Array.isArray(selectedCategories)) {
        if (!selectedCategories.includes('all') && selectedCategories.length > 0) {
            activePosts = activePosts.filter(post => selectedCategories.includes(post.category));
        }
    } else if (currentFilter !== 'all') {
        activePosts = activePosts.filter(post => post.category === currentFilter);
    }
    
    // Apply sorting
    switch (currentSortOrder) {
        case 'best':
            activePosts.sort((a, b) => (b.likes || 0) - (a.likes || 0));
            break;
        case 'trending':
            // Sort by likes in last 6 hours (simple trending algorithm)
            const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000);
            activePosts.sort((a, b) => {
                const aRecent = a.timestamp > sixHoursAgo ? (a.likes || 0) * 2 : (a.likes || 0);
                const bRecent = b.timestamp > sixHoursAgo ? (b.likes || 0) * 2 : (b.likes || 0);
                return bRecent - aRecent;
            });
            break;
        case 'newest':
        default:
            activePosts.sort((a, b) => b.timestamp - a.timestamp);
            break;
    }
    
    if (activePosts.length === 0) {
        const noPostsMessage = selectedCategories.includes('all') || currentFilter === 'all'
            ? 'No posts yet. Be the first to share something with your campus community!'
            : `No posts in the selected categories yet. Try a different category or create a post!`;
            
        container.innerHTML = `
            <div class="no-posts">
                <i class="fas fa-comments"></i>
                <p>${noPostsMessage}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = activePosts.map(post => {
        const postId = post._id || post.id;
        const canDelete = currentUser && (post.anonymousUserId === currentUser.uid);
        
        // Safety checks for post data
        const title = post.title || 'Untitled';
        const content = post.content || 'No content';
        const category = post.category || 'general';
        const timestamp = post.timestamp || Date.now();
        const expiresAt = post.expiresAt || (timestamp + POST_DURATION);
        const likes = post.likes || 0;
        const likedBy = post.likedBy || {};
        const hasLiked = currentUser && likedBy[currentUser.uid];
        
        // Get category display info
        const categoryInfo = getCategoryInfo(category);
        
        return `
            <div class="post">
                <div class="post-header">
                    <div class="post-category ${category}">
                        <i class="${categoryInfo.icon}"></i>
                        <span>${categoryInfo.name}</span>
                    </div>
                    <div class="post-meta">
                        <span class="post-time">Published: ${formatTimeAgo(timestamp)}</span>
                        <span class="post-likes">${likes} likes</span>
                    </div>
                </div>
                <div class="post-content">${escapeHtml(content)}</div>
                <div class="post-actions">
                    <button class="like-btn ${hasLiked ? 'liked' : ''}" data-post-id="${postId}">
                        <i class="fas fa-heart"></i>
                        <span>Like</span>
                    </button>
                    <button class="report-btn" data-post-id="${postId}">
                        <i class="fas fa-flag"></i>
                        <span>Report</span>
                    </button>
                    ${canDelete ? `<button class="delete-btn" data-post-id="${postId}">
                        <i class="fas fa-trash"></i>
                        <span>Delete</span>
                    </button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Get category display information
function getCategoryInfo(category) {
    const categories = {
        'academic': { name: 'Academic', icon: 'fas fa-book' },
        'social': { name: 'Social', icon: 'fas fa-users' },
        'events': { name: 'Events', icon: 'fas fa-calendar-alt' },
        'campus-life': { name: 'Campus Life', icon: 'fas fa-university' },
        'food': { name: 'Food & Dining', icon: 'fas fa-utensils' },
        'housing': { name: 'Housing', icon: 'fas fa-home' },
        'technology': { name: 'Technology', icon: 'fas fa-laptop' },
        'sports': { name: 'Sports', icon: 'fas fa-futbol' },
        'clubs': { name: 'Clubs & Organizations', icon: 'fas fa-theater-masks' },
        'general': { name: 'General Discussion', icon: 'fas fa-comment' }
    };
    
    return categories[category] || categories['general'];
}

// Toggle like for a post
async function toggleLike(postId) {
    if (!currentUser) {
        alert('Please wait for authentication...');
        return;
    }
    
    try {
        const post = posts.find(p => (p.id === postId || p._id === postId));
        if (!post) return;
        
        const likedBy = post.likedBy || {};
        const hasLiked = likedBy[currentUser.uid];
        
        // Update Firebase
        const postRef = ref(database, `posts/${postId}`);
        
        if (hasLiked) {
            // Unlike the post
            await update(postRef, {
                likes: (post.likes || 1) - 1,
                [`likedBy/${currentUser.uid}`]: null
            });
        } else {
            // Like the post
            await update(postRef, {
                likes: (post.likes || 0) + 1,
                [`likedBy/${currentUser.uid}`]: true
            });
        }
    } catch (error) {
        console.error('Error toggling like:', error);
        alert('Failed to update like. Please try again.');
    }
}

// Report a post
async function reportPost(postId) {
    if (!currentUser) {
        alert('Please wait for authentication...');
        return;
    }
    
    // Show report modal/options
    const reportReasons = [
        'Breaks the Content Policy',
        'Harassment',
        'Threatening violence',
        'Spam',
        'Sharing personal information',
        'Impersonation',
        'Prohibited transaction'
    ];
    
    let selectedReason = '';
    
    // Create a simple modal for report reasons
    const modal = document.createElement('div');
    modal.className = 'report-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Report Confession</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <p>Tell us about the issues with this confession and we'll look into it.</p>
                <div class="report-reasons">
                    ${reportReasons.map(reason => `
                        <button class="report-reason-btn" data-reason="${reason}">${reason}</button>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle reason selection
    modal.addEventListener('click', async function(e) {
        if (e.target.classList.contains('report-reason-btn')) {
            selectedReason = e.target.dataset.reason;
            
            try {
                // Submit report to Firebase
                const reportRef = ref(database, `reports/${postId}`);
                const reportData = {
                    postId: postId,
                    reportedBy: currentUser.uid,
                    reason: selectedReason,
                    timestamp: Date.now(),
                    status: 'pending'
                };
                
                await push(reportRef, reportData);
                
                // Also add to post's reports array
                const postReportsRef = ref(database, `posts/${postId}/reports`);
                await push(postReportsRef, reportData);
                
                alert('Thank you for your report. We will review it shortly.');
                
                // Safe modal removal
                if (modal && modal.parentNode) {
                    document.body.removeChild(modal);
                }
                
            } catch (error) {
                console.error('Error reporting post:', error);
                alert('Failed to submit report. Please try again.');
            }
        } else if (e.target.classList.contains('modal-close') || e.target === modal) {
            // Safe modal removal
            if (modal && modal.parentNode) {
                document.body.removeChild(modal);
            }
        }
    });
}

// Delete a post
function deletePost(id) {
    if (confirm('Are you sure you want to delete this post?')) {
        deletePostFirebase(id);
    }
}

// Delete post from Firebase
async function deletePostFirebase(id) {
    try {
        // Check if user owns this post
        const post = posts.find(p => p.id === id);
        if (!post || post.anonymousUserId !== currentUser.uid) {
            alert('You can only delete your own posts');
            return;
        }
        
        const postRef = ref(database, `posts/${id}`);
        await remove(postRef);
        console.log('Post deleted successfully');
        
    } catch (error) {
        console.error('Error deleting post:', error);
        alert('Failed to delete post. Please try again.');
    }
}

// Save posts to localStorage (simulating database)
function savePosts() {
    localStorage.setItem('campusPosts', JSON.stringify(posts));
}

// Format time ago
function formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

// Format time remaining
function formatTimeRemaining(expiresAt) {
    const expiry = expiresAt instanceof Date ? expiresAt.getTime() : expiresAt;
    const now = Date.now();
    const remaining = expiry - now;
    
    if (remaining <= 0) return 'Expired';
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

// Setup auto-delete functionality (offline mode)
function setupAutoDelete() {
    // Check for expired posts every minute
    setInterval(() => {
        const initialCount = posts.length;
        posts = posts.filter(post => post.expiresAt > Date.now());
        
        if (posts.length !== initialCount) {
            savePosts();
            displayPosts();
        }
    }, 60000); // Check every minute
    
    // Update time remaining display every 30 seconds
    setInterval(() => {
        displayPosts();
    }, 30000);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Expose functions globally as fallback for any cached onclick handlers
window.toggleLike = toggleLike;
window.deletePost = deletePost;