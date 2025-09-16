// Import Firebase modules
import { auth, database, signInAnonymously, onAuthStateChanged, ref, push, onValue, remove, update, serverTimestamp } from './firebase-config.js';

// Global variables
let currentUser = null;
let posts = [];
let reports = [];
let isAdminAuthenticated = false;
const ADMIN_PASSWORD = 'admin123'; // In production, use proper authentication

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeAuth();
    setupAdminLogin();
    setupThemeToggle();
    initializeTheme();
});

// Setup admin login
function setupAdminLogin() {
    const loginForm = document.getElementById('adminLoginForm');
    
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const password = document.getElementById('adminPassword').value;
        
        if (password === ADMIN_PASSWORD) {
            isAdminAuthenticated = true;
            showAdminDashboard();
        } else {
            alert('Invalid admin password');
        }
    });
}

// Show admin dashboard
function showAdminDashboard() {
    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'block';
    
    // Setup admin functionality
    setupAdminFilters();
    loadAdminPosts();
    loadAdminReports();
}

// Setup admin filters
function setupAdminFilters() {
    const filterButtons = document.querySelectorAll('.admin-filters .filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            const filter = this.dataset.filter;
            displayAdminPosts(filter);
        });
    });
}

// Setup theme toggle (same as main app)
function setupThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    
    themeToggle.addEventListener('click', function() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        const icon = themeToggle.querySelector('i');
        icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    });
}

// Initialize theme from localStorage
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const themeToggle = document.getElementById('themeToggle');
    const icon = themeToggle.querySelector('i');
    icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// Initialize Firebase auth
function initializeAuth() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            console.log('Admin authenticated:', user.uid);
        } else {
            signInAnonymously(auth)
                .then((result) => {
                    currentUser = result.user;
                    console.log('Admin signed in anonymously:', result.user.uid);
                })
                .catch((error) => {
                    console.error('Admin auth failed:', error);
                });
        }
    });
}

// Load posts for admin
function loadAdminPosts() {
    const postsRef = ref(database, 'posts');
    
    onValue(postsRef, (snapshot) => {
        posts = [];
        if (snapshot.exists()) {
            const data = snapshot.val();
            Object.keys(data).forEach(key => {
                posts.push({
                    id: key,
                    ...data[key]
                });
            });
        }
        
        updateAdminStats();
        displayAdminPosts('all');
    });
}

// Load reports for admin
function loadAdminReports() {
    const reportsRef = ref(database, 'reports');
    
    onValue(reportsRef, (snapshot) => {
        reports = [];
        if (snapshot.exists()) {
            const data = snapshot.val();
            Object.keys(data).forEach(postId => {
                const postReports = data[postId];
                Object.keys(postReports).forEach(reportId => {
                    reports.push({
                        id: reportId,
                        postId: postId,
                        ...postReports[reportId]
                    });
                });
            });
        }
        
        updateAdminStats();
        displayAdminReports();
    });
}

// Update admin statistics
function updateAdminStats() {
    const activePosts = posts.filter(post => {
        const expiresAt = post.expiresAt instanceof Date ? post.expiresAt.getTime() : post.expiresAt;
        return expiresAt > Date.now();
    });
    
    const totalLikes = posts.reduce((sum, post) => sum + (post.likes || 0), 0);
    const uniqueUsers = new Set(posts.map(post => post.anonymousUserId)).size;
    const pendingReports = reports.filter(report => report.status === 'pending').length;
    
    document.getElementById('totalPosts').textContent = activePosts.length;
    document.getElementById('totalLikes').textContent = totalLikes;
    document.getElementById('activeUsers').textContent = uniqueUsers;
    document.getElementById('flaggedPosts').textContent = pendingReports;
}

// Display posts in admin panel
function displayAdminPosts(filter = 'all') {
    if (!isAdminAuthenticated) return;
    
    const container = document.getElementById('adminPostsContainer');
    
    let filteredPosts = posts.filter(post => {
        const expiresAt = post.expiresAt instanceof Date ? post.expiresAt.getTime() : post.expiresAt;
        return expiresAt > Date.now();
    });
    
    // Apply filters
    switch (filter) {
        case 'recent':
            filteredPosts = filteredPosts.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
            break;
        case 'flagged':
            // Implement flagging system
            filteredPosts = [];
            break;
        case 'popular':
            filteredPosts = filteredPosts.sort((a, b) => (b.likes || 0) - (a.likes || 0));
            break;
    }
    
    if (filteredPosts.length === 0) {
        container.innerHTML = `
            <div class="no-posts">
                <i class="fas fa-inbox"></i>
                <p>No posts found for this filter.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredPosts.map(post => {
        const categoryInfo = getCategoryInfo(post.category || 'general');
        
        return `
            <div class="admin-post">
                <div class="admin-post-header">
                    <div class="post-category ${post.category || 'general'}">
                        <i class="${categoryInfo.icon}"></i>
                        ${categoryInfo.name}
                    </div>
                    <div class="post-stats">
                        <span><i class="fas fa-heart"></i> ${post.likes || 0}</span>
                        <span><i class="fas fa-clock"></i> ${formatTimeAgo(post.timestamp)}</span>
                    </div>
                </div>
                <div class="admin-post-content">
                    <h4>${escapeHtml(post.title)}</h4>
                    <p>${escapeHtml(post.content)}</p>
                </div>
                <div class="admin-post-actions">
                    <button class="btn-danger" onclick="adminDeletePost('${post.id}')">
                        <i class="fas fa-trash"></i>
                        Delete Post
                    </button>
                    <button class="btn-warning" onclick="flagPost('${post.id}')">
                        <i class="fas fa-flag"></i>
                        Flag
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Admin delete post
async function adminDeletePost(postId) {
    if (!isAdminAuthenticated) {
        alert('Admin authentication required');
        return;
    }
    
    if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
        try {
            const postRef = ref(database, `posts/${postId}`);
            await remove(postRef);
            console.log('Post deleted by admin:', postId);
        } catch (error) {
            console.error('Error deleting post:', error);
            alert('Failed to delete post');
        }
    }
}

// Flag post (placeholder for future implementation)
function flagPost(postId) {
    alert('Flagging functionality will be implemented in future updates');
}

// Utility functions
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

// Display admin reports
function displayAdminReports() {
    if (!isAdminAuthenticated) return;
    
    const container = document.getElementById('adminReportsContainer');
    if (!container) return;
    
    const pendingReports = reports.filter(report => report.status === 'pending');
    
    if (pendingReports.length === 0) {
        container.innerHTML = `
            <div class="no-reports">
                <i class="fas fa-shield-check"></i>
                <p>No pending reports</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = pendingReports.map(report => {
        const reportedPost = posts.find(post => post.id === report.postId);
        const postTitle = reportedPost ? (reportedPost.title || reportedPost.content.substring(0, 50) + '...') : 'Post not found';
        
        return `
            <div class="admin-report-card">
                <div class="report-header">
                    <div class="report-reason">${report.reason}</div>
                    <div class="report-time">${formatTimeAgo(report.timestamp)}</div>
                </div>
                <div class="report-content">
                    <h4>Reported Post:</h4>
                    <p>"${postTitle}"</p>
                    ${reportedPost ? `<p class="post-preview">${reportedPost.content.substring(0, 100)}...</p>` : ''}
                </div>
                <div class="report-actions">
                    <button class="btn-approve" onclick="handleReport('${report.id}', '${report.postId}', 'approved')">
                        <i class="fas fa-check"></i> Dismiss Report
                    </button>
                    <button class="btn-reject" onclick="handleReport('${report.id}', '${report.postId}', 'rejected')">
                        <i class="fas fa-trash"></i> Remove Post
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Handle report action
async function handleReport(reportId, postId, action) {
    try {
        if (action === 'rejected') {
            // Remove the post
            const postRef = ref(database, `posts/${postId}`);
            await remove(postRef);
            console.log('Post removed');
        }
        
        // Update report status
        const reportRef = ref(database, `reports/${postId}/${reportId}`);
        await update(reportRef, {
            status: action,
            adminAction: Date.now()
        });
        
        console.log(`Report ${action}`);
        
    } catch (error) {
        console.error('Error handling report:', error);
        alert('Failed to process report. Please try again.');
    }
}

// Make functions globally available
window.handleReport = handleReport;

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions global for onclick handlers
window.adminDeletePost = adminDeletePost;
window.flagPost = flagPost;