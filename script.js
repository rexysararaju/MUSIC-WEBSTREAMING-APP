// Music App Core Functionality
const MusicApp = {
    // Initialize the application
    init() {
        this.setupDOMReferences();
        this.setupEventListeners();
        this.loadLibrary();
        this.setupAudioPlayer();
        this.exposeMethods();
        this.checkAuthState();
    },

    // DOM Elements
    elements: {
        uploadForm: null,
        libraryContainer: null,
        audioPlayer: null,
        nowPlayingBar: null,
        playBtn: null,
        progressBar: null,
        volumeControl: null,
        currentTimeDisplay: null,
        totalTimeDisplay: null
    },

    // App State
    state: {
        currentTrack: null,
        isPlaying: false,
        isLoading: false,
        library: [],
        currentUser: null
    },

    // Setup DOM references
    setupDOMReferences() {
        this.elements = {
            uploadForm: document.getElementById('upload-form'),
            libraryContainer: document.querySelector('.music-library-grid'),
            audioPlayer: new Audio(),
            nowPlayingBar: document.querySelector('.now-playing-bar'),
            playBtn: document.getElementById('play-btn'),
            progressBar: document.querySelector('.progress-bar'),
            progressContainer: document.querySelector('.progress-container'),
            volumeControl: document.querySelector('.volume-control'),
            currentTimeDisplay: document.querySelector('.time-current'),
            totalTimeDisplay: document.querySelector('.time-total')
        };
    },

    // Setup event listeners
    setupEventListeners() {
        // Upload form
        if (this.elements.uploadForm) {
            this.elements.uploadForm.addEventListener('submit', (e) => this.handleUpload(e));
        }

        // Play button
        if (this.elements.playBtn) {
            this.elements.playBtn.addEventListener('click', () => this.togglePlayback());
        }

        // Progress bar seeking
        if (this.elements.progressContainer) {
            this.elements.progressContainer.addEventListener('click', (e) => this.seekTrack(e));
        }

        // Volume control
        if (this.elements.volumeControl) {
            this.elements.volumeControl.addEventListener('input', (e) => this.setVolume(e));
        }
    },

    // Expose methods to global scope
    exposeMethods() {
        window.playTrack = (trackId) => {
            const track = this.state.library.find(t => t.id === trackId);
            if (track) this.playTrack(track);
        };
    },

    // Handle music upload
    async handleUpload(e) {
        e.preventDefault();
        
        if (this.state.isLoading) return;
        this.state.isLoading = true;
        
        const formData = new FormData(this.elements.uploadForm);
        const audioFile = formData.get('song-file');
        const validAudioTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3'];
        
        if (!audioFile) {
            this.showAlert('Please select an audio file', 'error');
            this.state.isLoading = false;
            return;
        }

        if (!validAudioTypes.includes(audioFile.type)) {
            this.showAlert('Only MP3/WAV files are supported', 'error');
            this.state.isLoading = false;
            return;
        }

        try {
            // Create track object
            const newTrack = {
                id: Date.now().toString(),
                title: formData.get('song-title') || audioFile.name.replace(/\.[^/.]+$/, ""),
                artist: formData.get('song-artist') || 'Unknown Artist',
                audioUrl: URL.createObjectURL(audioFile),
                coverUrl: formData.get('song-cover') 
                    ? URL.createObjectURL(formData.get('song-cover'))
                    : this.generateCoverArt({ title: formData.get('song-title') || 'M' }),
                duration: 0,
                uploadDate: new Date().toISOString(),
                plays: 0
            };

            // Add to library
            this.state.library.push(newTrack);
            this.saveLibrary();

            this.showAlert('Upload successful!', 'success');
            this.renderLibrary();
            
            // Reset form
            this.elements.uploadForm.reset();
        } catch (error) {
            console.error('Upload error:', error);
            this.showAlert('Upload failed. Please try again.', 'error');
        } finally {
            this.state.isLoading = false;
        }
    },

    // Setup audio player
    setupAudioPlayer() {
        const { audioPlayer } = this.elements;
        
        audioPlayer.addEventListener('timeupdate', () => this.updateProgress());
        audioPlayer.addEventListener('ended', () => this.playNext());
        audioPlayer.addEventListener('loadedmetadata', () => {
            if (this.state.currentTrack) {
                this.state.currentTrack.duration = audioPlayer.duration;
                this.updateTimeDisplay();
            }
        });

        // Set initial volume
        audioPlayer.volume = this.elements.volumeControl ? 
            this.elements.volumeControl.value / 100 : 0.8;
    },

    // Play a track
    playTrack(track) {
        console.log('Attempting to play:', track);
        const { audioPlayer } = this.elements;
        
        // Pause current track if playing
        if (this.state.isPlaying) {
            audioPlayer.pause();
        }
        
        // Load new track
        this.state.currentTrack = track;
        audioPlayer.src = track.audioUrl;
        
        audioPlayer.play()
            .then(() => {
                this.state.isPlaying = true;
                this.updatePlayerUI();
                this.incrementPlayCount(track.id);
                console.log('Playback started successfully');
            })
            .catch(error => {
                console.error('Playback error:', error);
                this.showAlert(`Error playing track: ${error.message}`, 'error');
            });
    },

    // Toggle play/pause
    togglePlayback() {
        const { audioPlayer } = this.elements;
        
        if (!this.state.currentTrack) {
            if (this.state.library.length > 0) {
                this.playTrack(this.state.library[0]);
            }
            return;
        }
        
        if (audioPlayer.paused) {
            audioPlayer.play();
            this.state.isPlaying = true;
        } else {
            audioPlayer.pause();
            this.state.isPlaying = false;
        }
        
        this.updatePlayButton();
    },

    // Update progress bar
    updateProgress() {
        const { audioPlayer, progressBar } = this.elements;
        if (!progressBar || !audioPlayer.duration) return;
        
        const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progressBar.style.width = `${progress}%`;
        this.updateTimeDisplay();
    },

    // Seek to position in track
    seekTrack(e) {
        const { audioPlayer, progressContainer } = this.elements;
        if (!audioPlayer.duration) return;
        
        const clickPosition = e.offsetX;
        const progressBarWidth = progressContainer.clientWidth;
        const seekPercentage = (clickPosition / progressBarWidth);
        const seekTime = seekPercentage * audioPlayer.duration;
        
        audioPlayer.currentTime = seekTime;
    },

    // Set volume
    setVolume(e) {
        this.elements.audioPlayer.volume = e.target.value / 100;
    },

    // Play next track
    playNext() {
        if (!this.state.currentTrack) return;
        
        const currentIndex = this.state.library.findIndex(
            track => track.id === this.state.currentTrack.id
        );
        
        const nextIndex = (currentIndex + 1) % this.state.library.length;
        this.playTrack(this.state.library[nextIndex]);
    },

    // Update player UI
    updatePlayerUI() {
        const { currentTrack } = this.state;
        const { nowPlayingBar } = this.elements;
        
        if (!nowPlayingBar || !currentTrack) return;
        
        nowPlayingBar.querySelector('.now-playing-title').textContent = currentTrack.title;
        nowPlayingBar.querySelector('.now-playing-artist').textContent = currentTrack.artist;
        const coverImg = nowPlayingBar.querySelector('.now-playing-cover');
        if (coverImg) {
            coverImg.src = currentTrack.coverUrl;
            coverImg.alt = `${currentTrack.title} cover art`;
        }
        
        this.updatePlayButton();
        this.updateTimeDisplay();
    },

    // Update time display
    updateTimeDisplay() {
        const { audioPlayer, currentTimeDisplay, totalTimeDisplay } = this.elements;
        const { currentTrack } = this.state;
        
        if (!currentTrack || !currentTimeDisplay || !totalTimeDisplay) return;
        
        currentTimeDisplay.textContent = this.formatTime(audioPlayer.currentTime);
        totalTimeDisplay.textContent = this.formatTime(
            currentTrack.duration || audioPlayer.duration || 0
        );
    },

    // Update play button
    updatePlayButton() {
        const { playBtn } = this.elements;
        if (!playBtn) return;
        
        const icon = this.state.isPlaying ? 'pause' : 'play';
        playBtn.innerHTML = `<i class="fas fa-${icon}"></i>`;
    },

    // Increment play count
    incrementPlayCount(trackId) {
        const track = this.state.library.find(t => t.id === trackId);
        if (track) {
            track.plays = (track.plays || 0) + 1;
            this.saveLibrary();
            this.renderLibrary(); // Update the play count display
        }
    },

    // Render music library
    renderLibrary() {
        const { libraryContainer } = this.elements;
        if (!libraryContainer) return;
        
        libraryContainer.innerHTML = this.state.library.length > 0
            ? this.state.library.map(track => `
                <div class="music-card" data-id="${track.id}">
                    <div class="album-art" onclick="playTrack('${track.id}')">
                        <img src="${track.coverUrl}" alt="${track.title} cover art">
                        <div class="play-overlay"><i class="fas fa-play"></i></div>
                    </div>
                    <div class="track-info">
                        <h3>${track.title}</h3>
                        <p>${track.artist}</p>
                        <div class="track-meta">
                            <span>${this.formatDuration(track.duration)}</span>
                            <span>${track.plays || 0} plays</span>
                        </div>
                    </div>
                </div>
            `).join('')
            : `<div class="empty-library">
                <i class="fas fa-music"></i>
                <p>Your library is empty</p>
                <button class="btn-primary" onclick="document.getElementById('upload-btn').click()">
                    Add Music
                </button>
               </div>`;
    },

    // Load library from localStorage
    loadLibrary() {
        try {
            const library = localStorage.getItem('musicLibrary');
            this.state.library = library ? JSON.parse(library) : [];
            this.renderLibrary();
        } catch (error) {
            console.error('Error loading library:', error);
            this.state.library = [];
        }
    },

    // Save library to localStorage
    saveLibrary() {
        localStorage.setItem('musicLibrary', JSON.stringify(this.state.library));
    },

    // Generate placeholder cover art
    generateCoverArt(track) {
        const colors = ['#6c5b7b', '#c06c84', '#f8b195', '#355c7d'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const letter = track?.title?.charAt(0).toUpperCase() || 'M';
        
        return `data:image/svg+xml;utf8,
            <svg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300' fill='${randomColor}'>
                <rect width='300' height='300'/>
                <text x='150' y='150' font-size='120' fill='white' 
                    font-family='Arial' text-anchor='middle' dominant-baseline='middle'>
                    ${letter}
                </text>
            </svg>`;
    },

    // Format time (seconds to MM:SS)
    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    },

    // Format duration (alias for formatTime)
    formatDuration(seconds) {
        return this.formatTime(seconds);
    },

    // Show alert message
    showAlert(message, type) {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        document.body.appendChild(alert);
        
        setTimeout(() => {
            alert.remove();
        }, 3000);
    },

    // Check authentication state
    checkAuthState() {
        try {
            this.state.currentUser = JSON.parse(localStorage.getItem('currentUser'));
        } catch (error) {
            console.error('Error checking auth state:', error);
            this.state.currentUser = null;
        }
    }
};

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => MusicApp.init());




// Mobile menu functionality
document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    hamburger?.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });
    
    // Close menu when clicking links
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger?.classList.remove('active');
            navMenu?.classList.remove('active');
        });
    });
});