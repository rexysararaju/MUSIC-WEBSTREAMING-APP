// Main Application Module
const Melodify = (function() {
    // App State
    const state = {
        currentUser: null,
        isAdmin: false,
        musicLibrary: [],
        currentTrack: null,
        isPlaying: false,
        audioPlayer: new Audio(),
        playlists: []
    };

    // DOM Elements
    const elements = {
        // Will be initialized in init()
    };

    // Initialize the application
    function init() {
        setupDOMReferences();
        setupEventListeners();
        loadInitialData();
        checkAuthState();
    }

    // Set up DOM references
    function setupDOMReferences() {
        elements.navbar = document.querySelector('.navbar');
        elements.mainContent = document.querySelector('main');
        elements.audioPlayer = document.getElementById('audio-player');
        elements.nowPlayingBar = document.querySelector('.now-playing-bar');
        elements.playBtn = document.querySelector('.play-btn');
        elements.progressBar = document.querySelector('.progress-bar .progress');
        elements.currentTime = document.querySelector('.time-current');
        elements.totalTime = document.querySelector('.time-total');
        elements.volumeSlider = document.querySelector('.volume-slider');
        elements.uploadModal = document.getElementById('upload-modal');
        elements.uploadForm = document.getElementById('upload-form');
        elements.libraryGrid = document.querySelector('.music-library-grid');
    }

    // Set up event listeners
    function setupEventListeners() {
        // Audio player events
        elements.audioPlayer.addEventListener('timeupdate', updateProgressBar);
        elements.audioPlayer.addEventListener('ended', playNextTrack);
        elements.audioPlayer.addEventListener('loadedmetadata', updateTrackDuration);

        // Player control events
        if (elements.playBtn) {
            elements.playBtn.addEventListener('click', togglePlay);
        }

        // Volume control
        if (elements.volumeSlider) {
            elements.volumeSlider.addEventListener('input', setVolume);
        }

        // Upload modal
        if (document.getElementById('upload-btn')) {
            document.getElementById('upload-btn').addEventListener('click', openUploadModal);
        }

        if (document.querySelector('.close-modal')) {
            document.querySelector('.close-modal').addEventListener('click', closeUploadModal);
        }

        // Register form
        if (document.getElementById('register-form')) {
            document.getElementById('register-form').addEventListener('submit', handleRegister);
        }

        // Login form
        if (document.getElementById('login-form')) {
            document.getElementById('login-form').addEventListener('submit', handleLogin);
        }

        // Password toggle
        document.querySelectorAll('.toggle-password').forEach(button => {
            button.addEventListener('click', togglePasswordVisibility);
        });

        // File upload display
        if (document.getElementById('song-file')) {
            document.getElementById('song-file').addEventListener('change', displayFileName);
        }
    }

    // Load initial data from localStorage
    function loadInitialData() {
        const savedLibrary = localStorage.getItem('musicLibrary');
        const savedUsers = localStorage.getItem('users');
        const savedPlaylists = localStorage.getItem('playlists');
        const currentUser = localStorage.getItem('currentUser');

        if (savedLibrary) {
            state.musicLibrary = JSON.parse(savedLibrary);
        }

        if (savedPlaylists) {
            state.playlists = JSON.parse(savedPlaylists);
        }

        if (currentUser) {
            state.currentUser = JSON.parse(currentUser);
            state.isAdmin = state.currentUser.role === 'admin';
        }
    }

    // Check authentication state
    function checkAuthState() {
        if (state.currentUser) {
            updateUIForLoggedInUser();
        } else {
            updateUIForGuest();
        }
    }

    // Update UI for logged in user
    function updateUIForLoggedInUser() {
        // Show user-specific elements
        document.querySelectorAll('.user-only').forEach(el => el.style.display = 'block');
        document.querySelectorAll('.guest-only').forEach(el => el.style.display = 'none');

        // Update user info in navbar
        if (document.querySelector('.user-avatar')) {
            document.querySelector('.user-avatar').src = state.currentUser.avatar || 'assets/images/user-default.jpg';
            document.querySelector('.user-btn span').textContent = state.currentUser.username;
        }

        // Load user library if on library page
        if (window.location.pathname.includes('library.html')) {
            renderMusicLibrary();
        }
    }

    // Update UI for guest
    function updateUIForGuest() {
        document.querySelectorAll('.user-only').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.guest-only').forEach(el => el.style.display = 'block');

        // Redirect from protected pages
        if (window.location.pathname.includes('library.html') || 
            window.location.pathname.includes('upload.html')) {
            window.location.href = 'login.html';
        }
    }

    // Handle user registration
    async function handleRegister(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        // Basic validation
        if (password !== confirmPassword) {
            showAlert('Passwords do not match', 'error');
            return;
        }

        // Check if user exists
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const userExists = users.some(user => user.email === email || user.username === username);

        if (userExists) {
            showAlert('User with this email or username already exists', 'error');
            return;
        }

        // Create new user
        const newUser = {
            id: generateId(),
            username,
            email,
            password: hashPassword(password), // In a real app, use proper hashing
            role: 'user',
            createdAt: new Date().toISOString(),
            library: []
        };

        // Save user
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));

        // Log the user in
        state.currentUser = newUser;
        localStorage.setItem('currentUser', JSON.stringify(newUser));

        showAlert('Registration successful!', 'success');
        setTimeout(() => {
            window.location.href = 'library.html';
        }, 1500);
    }

    // Handle user login
    async function handleLogin(e) {
        e.preventDefault();
        
        const emailOrUsername = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        // Get users from localStorage
        const users = JSON.parse(localStorage.getItem('users')) || [];

        // Find user by email or username
        const user = users.find(user => 
            user.email === emailOrUsername || user.username === emailOrUsername
        );

        if (!user || user.password !== hashPassword(password)) {
            showAlert('Invalid credentials', 'error');
            return;
        }

        // Log the user in
        state.currentUser = user;
        state.isAdmin = user.role === 'admin';
        localStorage.setItem('currentUser', JSON.stringify(user));

        showAlert('Login successful!', 'success');
        setTimeout(() => {
            window.location.href = user.role === 'admin' ? 'admin/dashboard.html' : 'library.html';
        }, 1500);
    }

    // Handle music upload
    async function handleUpload(e) {
        e.preventDefault();
        
        const title = document.getElementById('song-title').value;
        const artist = document.getElementById('song-artist').value;
        const album = document.getElementById('song-album').value;
        const genre = document.getElementById('song-genre').value;
        const fileInput = document.getElementById('song-file');
        const coverInput = document.getElementById('song-cover');

        if (!fileInput.files[0]) {
            showAlert('Please select an audio file', 'error');
            return;
        }

        // Create a preview URL for the audio file
        const audioUrl = URL.createObjectURL(fileInput.files[0]);
        let coverUrl = 'assets/images/album-placeholder.jpg';

        // Process cover art if provided
        if (coverInput.files[0]) {
            coverUrl = URL.createObjectURL(coverInput.files[0]);
        }

        // Create new track object
        const newTrack = {
            id: generateId(),
            title,
            artist,
            album: album || 'Unknown Album',
            genre: genre || 'Other',
            audioUrl,
            coverUrl,
            duration: 0, // Will be updated when loaded
            uploader: state.currentUser.id,
            uploadDate: new Date().toISOString(),
            status: state.isAdmin ? 'approved' : 'pending',
            plays: 0
        };

        // Add to library
        state.musicLibrary.push(newTrack);
        localStorage.setItem('musicLibrary', JSON.stringify(state.musicLibrary));

        // If admin, add directly to user's library
        if (state.isAdmin) {
            addToUserLibrary(newTrack.id);
        }

        showAlert('Music uploaded successfully!', 'success');
        closeUploadModal();
        
        if (window.location.pathname.includes('library.html')) {
            renderMusicLibrary();
        }
    }

    // Render music library
    function renderMusicLibrary() {
        if (!elements.libraryGrid) return;

        // Clear existing content
        elements.libraryGrid.innerHTML = '';

        // Filter tracks based on user role
        let tracksToDisplay = [];
        if (state.isAdmin) {
            tracksToDisplay = state.musicLibrary;
        } else {
            tracksToDisplay = state.musicLibrary.filter(track => 
                track.status === 'approved' || track.uploader === state.currentUser.id
            );
        }

        if (tracksToDisplay.length === 0) {
            elements.libraryGrid.innerHTML = `
                <div class="empty-library">
                    <i class="fas fa-music"></i>
                    <h3>Your library is empty</h3>
                    <p>Upload your first song to get started</p>
                    <button class="btn-primary" id="empty-upload-btn">
                        <i class="fas fa-cloud-upload-alt"></i> Upload Music
                    </button>
                </div>
            `;
            
            document.getElementById('empty-upload-btn').addEventListener('click', openUploadModal);
            return;
        }

        // Render each track
        tracksToDisplay.forEach(track => {
            const trackElement = document.createElement('div');
            trackElement.className = 'music-item';
            trackElement.innerHTML = `
                <div class="album-cover">
                    <img src="${track.coverUrl}" alt="${track.title}">
                    <div class="play-overlay" data-id="${track.id}">
                        <i class="fas fa-play"></i>
                    </div>
                </div>
                <div class="track-info">
                    <h4>${track.title}</h4>
                    <p>${track.artist}</p>
                    ${state.isAdmin ? `<span class="track-status ${track.status}">${track.status}</span>` : ''}
                </div>
                <div class="track-actions">
                    <button class="btn-icon add-to-playlist" data-id="${track.id}" title="Add to playlist">
                        <i class="fas fa-plus"></i>
                    </button>
                    ${track.uploader === state.currentUser.id || state.isAdmin ? `
                    <button class="btn-icon delete-track" data-id="${track.id}" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                    ` : ''}
                </div>
            `;
            elements.libraryGrid.appendChild(trackElement);
        });

        // Add event listeners to play buttons
        document.querySelectorAll('.play-overlay').forEach(button => {
            button.addEventListener('click', function() {
                const trackId = this.getAttribute('data-id');
                playTrack(trackId);
            });
        });

        // Add event listeners to playlist buttons
        document.querySelectorAll('.add-to-playlist').forEach(button => {
            button.addEventListener('click', function() {
                const trackId = this.getAttribute('data-id');
                showPlaylistModal(trackId);
            });
        });

        // Add event listeners to delete buttons
        document.querySelectorAll('.delete-track').forEach(button => {
            button.addEventListener('click', function() {
                const trackId = this.getAttribute('data-id');
                deleteTrack(trackId);
            });
        });
    }

    // Play a track
    function playTrack(trackId) {
        const track = state.musicLibrary.find(t => t.id === trackId);
        if (!track) return;

        state.currentTrack = track;
        elements.audioPlayer.src = track.audioUrl;
        elements.audioPlayer.play();
        state.isPlaying = true;
        updateNowPlayingUI();

        // Update play count
        track.plays++;
        localStorage.setItem('musicLibrary', JSON.stringify(state.musicLibrary));
    }

    // Toggle play/pause
    function togglePlay() {
        if (!state.currentTrack) {
            // Play the first track if nothing is playing
            if (state.musicLibrary.length > 0) {
                playTrack(state.musicLibrary[0].id);
            }
            return;
        }

        if (state.isPlaying) {
            elements.audioPlayer.pause();
        } else {
            elements.audioPlayer.play();
        }
        state.isPlaying = !state.isPlaying;
        updatePlayButton();
    }

    // Update the play button icon
    function updatePlayButton() {
        if (!elements.playBtn) return;
        
        elements.playBtn.innerHTML = state.isPlaying ? 
            '<i class="fas fa-pause"></i>' : 
            '<i class="fas fa-play"></i>';
    }

    // Update the progress bar
    function updateProgressBar() {
        if (!elements.progressBar || !elements.audioPlayer) return;
        
        const { currentTime, duration } = elements.audioPlayer;
        const progressPercent = (currentTime / duration) * 100;
        elements.progressBar.style.width = `${progressPercent}%`;
        
        // Update time display
        elements.currentTime.textContent = formatTime(currentTime);
    }

    // Update track duration display
    function updateTrackDuration() {
        if (!elements.totalTime) return;
        elements.totalTime.textContent = formatTime(elements.audioPlayer.duration);
    }

    // Format time (seconds to MM:SS)
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    // Play next track
    function playNextTrack() {
        if (!state.currentTrack) return;
        
        const currentIndex = state.musicLibrary.findIndex(t => t.id === state.currentTrack.id);
        const nextIndex = (currentIndex + 1) % state.musicLibrary.length;
        playTrack(state.musicLibrary[nextIndex].id);
    }

    // Set volume
    function setVolume() {
        elements.audioPlayer.volume = elements.volumeSlider.value / 100;
    }

    // Update now playing UI
    function updateNowPlayingUI() {
        if (!state.currentTrack || !elements.nowPlayingBar) return;
        
        const nowPlayingInfo = elements.nowPlayingBar.querySelector('.track-info');
        nowPlayingInfo.querySelector('.track-title').textContent = state.currentTrack.title;
        nowPlayingInfo.querySelector('.track-artist').textContent = state.currentTrack.artist;
        
        const coverImg = elements.nowPlayingBar.querySelector('.now-playing-cover');
        coverImg.src = state.currentTrack.coverUrl;
        
        updatePlayButton();
    }

    // Open upload modal
    function openUploadModal() {
        if (!state.currentUser) {
            window.location.href = 'login.html';
            return;
        }
        
        elements.uploadModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    // Close upload modal
    function closeUploadModal() {
        elements.uploadModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        elements.uploadForm.reset();
        document.getElementById('file-name').textContent = 'No file selected';
    }

    // Show playlist modal
    function showPlaylistModal(trackId) {
        // Implementation for adding to playlist
    }

    // Delete a track
    function deleteTrack(trackId) {
        if (!confirm('Are you sure you want to delete this track?')) return;
        
        state.musicLibrary = state.musicLibrary.filter(track => track.id !== trackId);
        localStorage.setItem('musicLibrary', JSON.stringify(state.musicLibrary));
        
        if (state.currentTrack?.id === trackId) {
            // If deleting currently playing track, stop playback
            elements.audioPlayer.pause();
            elements.audioPlayer.src = '';
            state.currentTrack = null;
            state.isPlaying = false;
            updateNowPlayingUI();
        }
        
        renderMusicLibrary();
        showAlert('Track deleted successfully', 'success');
    }

    // Add track to user's library
    function addToUserLibrary(trackId) {
        if (!state.currentUser.library.includes(trackId)) {
            state.currentUser.library.push(trackId);
            
            // Update user in localStorage
            const users = JSON.parse(localStorage.getItem('users'));
            const userIndex = users.findIndex(u => u.id === state.currentUser.id);
            if (userIndex !== -1) {
                users[userIndex] = state.currentUser;
                localStorage.setItem('users', JSON.stringify(users));
                localStorage.setItem('currentUser', JSON.stringify(state.currentUser));
            }
        }
    }

    // Toggle password visibility
    function togglePasswordVisibility(e) {
        const button = e.target.closest('.toggle-password');
        const input = button.previousElementSibling;
        
        if (input.type === 'password') {
            input.type = 'text';
            button.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            input.type = 'password';
            button.innerHTML = '<i class="fas fa-eye"></i>';
        }
    }

    // Display selected file name
    function displayFileName(e) {
        const fileName = e.target.files[0]?.name || 'No file selected';
        document.getElementById('file-name').textContent = fileName;
    }

    // Show alert message
    function showAlert(message, type) {
        // Implementation for showing alert messages
        alert(`${type.toUpperCase()}: ${message}`); // Simplified for this example
    }

    // Generate unique ID
    function generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    // Simple password hashing (for demo only - use proper hashing in production)
    function hashPassword(password) {
        return password.split('').reverse().join('') + password.length;
    }

    // Public API
    return {
        init,
        state,
        playTrack,
        togglePlay
    };
})();

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', Melodify.init);

// Admin Module (for admin functionality)
const AdminModule = (function() {
    // Admin-specific functions
    function approveTrack(trackId) {
        const track = Melodify.state.musicLibrary.find(t => t.id === trackId);
        if (track) {
            track.status = 'approved';
            localStorage.setItem('musicLibrary', JSON.stringify(Melodify.state.musicLibrary));
            Melodify.showAlert('Track approved', 'success');
            return true;
        }
        return false;
    }

    function rejectTrack(trackId) {
        Melodify.state.musicLibrary = Melodify.state.musicLibrary.filter(t => t.id !== trackId);
        localStorage.setItem('musicLibrary', JSON.stringify(Melodify.state.musicLibrary));
        Melodify.showAlert('Track rejected', 'success');
        return true;
    }

    function suspendUser(userId) {
        // Implementation for suspending users
    }

    return {
        approveTrack,
        rejectTrack,
        suspendUser
    };
})();

// Playlist Module
const PlaylistModule = (function() {
    function createPlaylist(name, isPublic = false) {
        const newPlaylist = {
            id: Melodify.generateId(),
            name,
            isPublic,
            creator: Melodify.state.currentUser.id,
            tracks: [],
            createdAt: new Date().toISOString()
        };

        Melodify.state.playlists.push(newPlaylist);
        localStorage.setItem('playlists', JSON.stringify(Melodify.state.playlists));
        return newPlaylist;
    }

    function addToPlaylist(playlistId, trackId) {
        const playlist = Melodify.state.playlists.find(p => p.id === playlistId);
        if (playlist) {
            if (!playlist.tracks.includes(trackId)) {
                playlist.tracks.push(trackId);
                localStorage.setItem('playlists', JSON.stringify(Melodify.state.playlists));
                return true;
            }
        }
        return false;
    }

    return {
        createPlaylist,
        addToPlaylist
    };
})();