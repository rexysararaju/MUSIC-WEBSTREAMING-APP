// Handle music upload and display
document.getElementById('upload-form')?.addEventListener('submit', function (e) {
    e.preventDefault();

    const fileInput = document.getElementById('music-file');
    const file = fileInput.files[0];

    if (file && file.type.startsWith('audio')) {
        const newMusic = {
            title: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
            artist: 'Unknown Artist',
            src: URL.createObjectURL(file), // Create a playable URL
            img: "https://via.placeholder.com/120/FF8DA3/FFFFFF?text=Music" // Placeholder image
        };

        // Save to local storage
        let musicLibrary = JSON.parse(localStorage.getItem('musicLibrary')) || [];
        musicLibrary.push(newMusic);
        localStorage.setItem('musicLibrary', JSON.stringify(musicLibrary));

        alert('Music uploaded successfully!');
        window.location.href = 'library.html'; // Redirect to library page
    } else {
        alert('Please upload a valid audio file.');
    }
});
// Simple music library array
const musicLibrary = [
    {
        title: "Song 1",
        artist: "Artist 1",
        src: "music/song1.mp3",
        img: "https://via.placeholder.com/120/FF8DA3/FFFFFF?text=Song1"
    },
    {
        title: "Song 2",
        artist: "Artist 2",
        src: "music/song2.mp3",
        img: "https://via.placeholder.com/120/FF8DA3/FFFFFF?text=Song2"
    },
    {
        title: "Song 3",
        artist: "Artist 3",
        src: "music/song3.mp3",
        img: "https://via.placeholder.com/120/FF8DA3/FFFFFF?text=Song3"
    }
];

// Function to display music in the library
function displayMusic() {
    const musicList = document.getElementById('music-list');
    musicList.innerHTML = ''; // Clear existing list

    // Load music from local storage
    const musicLibrary = JSON.parse(localStorage.getItem('musicLibrary')) || [];

    musicLibrary.forEach((music, index) => {
        const musicItem = document.createElement('div');
        musicItem.classList.add('music-item');
        musicItem.innerHTML = `
            <img src="${music.img}" alt="${music.title}">
            <h3>${music.title}</h3>
            <p>${music.artist}</p>
            <audio controls>
                <source src="${music.src}" type="audio/mp3">
                Your browser does not support the audio element.
            </audio>
        `;
        musicList.appendChild(musicItem);
    });
}

// Function to play selected music
function playMusic(index) {
    const audioPlayer = document.getElementById('audio-player-element');
    const audioSource = document.getElementById('audio-source');
    audioSource.src = musicLibrary[index].src;
    audioPlayer.load(); // Refresh the audio source
    audioPlayer.play();
}

// script.js

// Registration Form Handling
document.addEventListener('DOMContentLoaded', function () {
    const registerForm = document.getElementById('register-form');

    if (registerForm) {
        registerForm.addEventListener('submit', function (event) {
            event.preventDefault(); // Prevent form from submitting

            // Get form values
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            // Perform validation (you can add more validation logic here)
            if (!username || !email || !password) {
                alert('Please fill in all fields.');
                return;
            }

            // Simulate registration (replace with actual backend API call)
            console.log('Registering user:', { username, email, password });
            alert('Registration successful! Redirecting to login page...');

            // Redirect to login page after successful registration
            window.location.href = 'login.html';
        });
    }
});
// Load music when the library page loads
if (window.location.pathname.includes('library.html')) {
    displayMusic();
}