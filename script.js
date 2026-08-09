// static/script.js

document.addEventListener('DOMContentLoaded', () => {
    // ------------------ Elements ------------------
    const weatherWidget = document.getElementById('weather-widget');
    const weatherLoading = document.getElementById('weather-loading');
    const weatherContent = document.getElementById('weather-content');
    const locationFallback = document.getElementById('location-fallback');

    const weatherIcon = document.getElementById('weather-icon');
    const temperatureSpan = document.getElementById('temperature');
    const weatherDescSpan = document.getElementById('weather-desc');
    const locationNameSpan = document.getElementById('location-name');

    const manualCityInput = document.getElementById('manual-city');
    const searchCityBtn = document.getElementById('search-city-btn');

    const chatBox = document.getElementById('chat-box');
    const chatForm = document.getElementById('chat-form');
    const queryInput = document.getElementById('query-input');
    const sendBtn = document.getElementById('send-btn');
    const languageSelect = document.getElementById('language-select');

    // State Variables
    let currentWeatherContext = "Clear"; // Default context for AI
    let currentCityContext = "Unknown";
    let isWaitingForResponse = false;

    // ------------------ Weather & Location Logic ------------------

    // Initialize Weather
    function initWeather() {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    fetchWeatherByCoords(lat, lon);
                },
                (error) => {
                    console.warn("Geolocation denied or error:", error);
                    showLocationFallback();
                },
                { timeout: 10000 }
            );
        } else {
            showLocationFallback();
        }
    }

    function showLocationFallback() {
        weatherLoading.classList.add('hidden');
        locationFallback.classList.remove('hidden');
    }

    async function fetchWeatherByCoords(lat, lon) {
        try {
            // we will call our backend API to handle the actual weather fetch
            const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
            const data = await response.json();

            if (response.ok) {
                updateWeatherUI(data);
            } else {
                showLocationFallback();
            }
        } catch (error) {
            console.error("Error fetching weather:", error);
            showLocationFallback();
        }
    }

    async function fetchWeatherByCity(city) {
        weatherLoading.classList.remove('hidden');
        weatherContent.classList.add('hidden');
        locationFallback.classList.add('hidden');

        try {
            const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
            const data = await response.json();

            if (response.ok) {
                updateWeatherUI(data);
            } else {
                alert("City not found or weather service unavailable.");
                showLocationFallback();
            }
        } catch (error) {
            console.error("Error fetching weather by city:", error);
            showLocationFallback();
        }
    }

    function updateWeatherUI(data) {
        weatherLoading.classList.add('hidden');
        locationFallback.classList.add('hidden');
        weatherContent.classList.remove('hidden');

        // Update DOM
        temperatureSpan.textContent = `${Math.round(data.temperature)}°C`;
        weatherDescSpan.textContent = data.description;
        locationNameSpan.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${data.location}`;

        // Update Icon based on description
        updateWeatherIcon(data.description.toLowerCase());

        // Update context for AI
        currentWeatherContext = data.description;
        currentCityContext = data.location;
    }

    function updateWeatherIcon(desc) {
        weatherIcon.className = 'fa-solid'; // reset
        if (desc.includes('clear') || desc.includes('sunny')) {
            weatherIcon.classList.add('fa-sun');
        } else if (desc.includes('cloud')) {
            weatherIcon.classList.add('fa-cloud');
        } else if (desc.includes('rain')) {
            weatherIcon.classList.add('fa-cloud-rain');
        } else if (desc.includes('snow')) {
            weatherIcon.classList.add('fa-snowflake');
        } else if (desc.includes('thunder')) {
            weatherIcon.classList.add('fa-bolt');
        } else {
            weatherIcon.classList.add('fa-cloud-sun'); // default
        }
    }

    // Manual city search listener
    searchCityBtn.addEventListener('click', () => {
        const city = manualCityInput.value.trim();
        if (city) {
            fetchWeatherByCity(city);
        }
    });
    manualCityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const city = manualCityInput.value.trim();
            if (city) {
                fetchWeatherByCity(city);
            }
        }
    });

    // ------------------ Chat Logic ------------------

    function scrollToBottom() {
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function appendMessage(role, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        // Simple markdown parsing for the response
        const formattedText = parseMarkdown(text);
        contentDiv.innerHTML = formattedText;

        messageDiv.appendChild(contentDiv);
        chatBox.appendChild(messageDiv);
        scrollToBottom();
    }

    // Very basic markdown to HTML converter for AI response
    function parseMarkdown(text) {
        let html = text
            // Bold
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
            // Line breaks
            .replace(/\n/g, '<br>');

        // Handle simple lists (lines starting with - or *)
        const lines = html.split('<br>');
        let inList = false;
        let result = '';

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            const isListItem = line.trim().startsWith('- ') || line.trim().startsWith('* ');

            if (isListItem) {
                if (!inList) {
                    result += '<ul>';
                    inList = true;
                }
                const content = line.trim().substring(2);
                result += `<li>${content}</li>`;
            } else {
                if (inList) {
                    result += '</ul>';
                    inList = false;
                }
                if (line.trim() !== '') {
                    result += `<p>${line}</p>`;
                }
            }
        }
        if (inList) result += '</ul>';

        if (result === '') result = `<p>${html}</p>`; // Fallback

        return result;
    }

    function showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator message';
        indicator.id = 'typing-indicator';
        indicator.innerHTML = `
            <div class="dot dot-1"></div>
            <div class="dot dot-2"></div>
            <div class="dot dot-3"></div>
        `;
        chatBox.appendChild(indicator);
        scrollToBottom();
    }

    function hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (isWaitingForResponse) return;

        const query = queryInput.value.trim();
        if (!query) return;

        const lang = languageSelect.value;

        // Append user message
        appendMessage('user', query);
        queryInput.value = '';
        queryInput.blur(); // dismiss mobile keyboard

        // Lock UI
        isWaitingForResponse = true;
        sendBtn.disabled = true;
        showTypingIndicator();

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: query,
                    weather: currentWeatherContext,
                    location: currentCityContext,
                    language: lang
                })
            });

            const data = await response.json();
            hideTypingIndicator();

            if (response.ok) {
                appendMessage('ai', data.response);
            } else {
                appendMessage('ai', data.error || "Sorry, I encountered an error communicating with the server.");
            }
        } catch (err) {
            console.error("Chat error:", err);
            hideTypingIndicator();
            appendMessage('ai', "Network error. Please try again later.");
        } finally {
            isWaitingForResponse = false;
            sendBtn.disabled = false;
            queryInput.focus();
        }
    });

    // ------------------ initialization ------------------
    initWeather();
    queryInput.focus();

    // Change font based on selected language
    function updateLanguageFont() {
        const lang = languageSelect.value;
        document.body.classList.remove('lang-hi', 'lang-te');
        if (lang === 'hi') {
            document.body.classList.add('lang-hi');
        } else if (lang === 'te') {
            document.body.classList.add('lang-te');
        }
    }

    languageSelect.addEventListener('change', updateLanguageFont);
    updateLanguageFont(); // Call initially in case non-English is pre-selected
});
