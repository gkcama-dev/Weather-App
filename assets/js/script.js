/*
   config
*/
const WEATHERAPI_KEY = '58f884011b86402f988144734251711';
const DEFAULT_CITY = 'Colombo';

/* 
   Utility: create floating bubbles
 */
function createBubbles(target = document.body, count = 12) {
    const colors = [
        "rgba(255,255,255,0.15)",
        "rgba(255,255,255,0.10)",
        "rgba(255,255,255,0.20)"
    ];

    const blurLevels = ["0px", "2px", "4px", "6px", "8px"];

    for (let i = 0; i < count; i++) {
        const bubble = document.createElement("div");
        bubble.className = "bubble";

        const size = Math.floor(Math.random() * 120) + 40;
        const depth = Math.random() * 0.7 + 0.3; // for parallax depth

        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;

        bubble.style.top = `${Math.random() * 100}%`;
        bubble.style.left = `${Math.random() * 100}%`;

        // Color + glow
        bubble.style.background = colors[Math.floor(Math.random() * colors.length)];
        bubble.style.boxShadow = `0 0 ${Math.random() * 25 + 5}px rgba(255,255,255,0.25)`;

        // Blur variation
        bubble.style.filter = `blur(${blurLevels[Math.floor(Math.random() * blurLevels.length)]})`;

        // Random animation length
        const moveDuration = Math.random() * 8 + 12;
        bubble.style.animationDuration = `${moveDuration}s`;

        // Slight rotation
        bubble.style.animationDelay = `${Math.random() * 5}s`;
        bubble.style.transform = `scale(${depth})`;

        target.appendChild(bubble);
    }
}
createBubbles();


function updateWeatherUI(data) {
    if (!data || data.error) {
        console.error('Weather fetch error:', data ? data.error : 'no data');
        document.getElementById('location-name').textContent = 'Location Not Found';
        document.getElementById('current-temp').textContent = '—°C';
        document.getElementById('weather-condition').textContent = 'No Data';
        document.getElementById('precipitation').textContent = 'Precipitation: —';
        ['uv-index-value', 'wind-speed', 'sunrise-time', 'sunset-time', 'humidity-value', 'visibility-value', 'air-quality-value'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '—';
        });
        return;
    }

    // Useful shortcuts
    const current = data.current;
    const location = data.location;
    const forecastDay = data.forecast?.forecastday?.[0]?.astro || {};
    const aqi = current.air_quality || {};

    // Left panel
    document.getElementById('location-name').textContent = `${location.name}, ${location.country}`;
    document.getElementById('current-temp').textContent = `${Math.round(current.temp_c)}°C`;
    document.getElementById('weather-condition').textContent = current.condition?.text || '—';
    const localTime = new Date(location.localtime);
    document.getElementById('current-date').textContent = localTime.toLocaleDateString('en-US', { weekday: 'long', hour: '2-digit', minute: '2-digit' });

    // Icon: WeatherAPI icons sometimes are served as "//cdn..." links.
    let iconUrl = current.condition?.icon || '';
    if (iconUrl.startsWith('//')) iconUrl = 'https:' + iconUrl;
    // fallback
    if (!iconUrl) iconUrl = 'https://cdn-icons-png.flaticon.com/512/1163/1163624.png';
    document.getElementById('weather-icon').src = iconUrl;

    // Precip
    document.getElementById('precipitation').textContent = `Precipitation: ${current.precip_mm ?? '—'} mm`;

    // UV — fallback to forecast UV if current UV missing
    let uvIndex = 0;

    if (typeof current.uv === 'number' && current.uv > 0) {
        uvIndex = current.uv;
    } else {
        // use forecast UV when current UV = 0 or null
        uvIndex = data.forecast?.forecastday?.[0]?.day?.uv || 0;
    }

    const uvDisplay = uvIndex.toFixed(1);
    document.getElementById('uv-index-value').textContent = uvDisplay;
    document.getElementById('uv-index-text').textContent = getUVIndexText(uvIndex);
    const uvProgressPercent = Math.min(100, Math.round(uvIndex) * 10);
    document.getElementById('uv-progress').style.width = `${uvProgressPercent}%`;
    // style of progress bar
    const uvColor = uvIndex <= 2 ? 'bg-success' : uvIndex <= 5 ? 'bg-warning' : uvIndex <= 7 ? 'bg-danger' : 'bg-danger';
    document.getElementById('uv-progress').className = `progress-bar ${uvColor}`;
    console.log('UV Index from API:', current.uv, 'Processed:', uvDisplay);

    // Wind
    document.getElementById('wind-speed').textContent = `${Math.round(current.wind_kph)} km/h`;
    document.getElementById('wind-direction-text').textContent = current.wind_dir || '—';
    // rotate arrow (icon points up by default, rotate by wind_degree)
    const windIcon = document.getElementById('wind-direction-icon');
    if (windIcon && typeof current.wind_degree === 'number') {
        windIcon.style.transform = `rotate(${current.wind_degree}deg)`;
    }

    // Sunrise/Sunset from forecast astro
    document.getElementById('sunrise-time').textContent = forecastDay.sunrise || '—';
    document.getElementById('sunset-time').textContent = forecastDay.sunset || '—';

    // Humidity
    const humidity = current.humidity ?? 0;
    document.getElementById('humidity-value').textContent = `${humidity}%`;
    document.getElementById('humidity-text').textContent = getHumidityText(humidity);
    document.getElementById('humidity-progress').style.width = `${Math.min(100, humidity)}%`;
    // pick color class for progress
    const humClass = humidity <= 30 ? 'bg-danger' : (humidity <= 60 ? 'bg-success' : 'bg-info');
    document.getElementById('humidity-progress').className = `progress-bar ${humClass}`;

    // Visibility
    const visKm = current.vis_km ?? 0;
    document.getElementById('visibility-value').textContent = `${visKm} km`;
    document.getElementById('visibility-text').textContent = getVisibilityText(visKm);

    // Air Quality - choose a dominant metric to display if available
    const aqiIndex = aqi['us-epa-index'] ?? null;
    document.getElementById('air-quality-value').textContent = getAQIValue(aqi);
    const aqiData = getAQIText(aqiIndex);
    document.getElementById('air-quality-text').textContent = aqiData.text;
    const aqiInd = document.getElementById('aqi-indicator');
    aqiInd.className = `aqi-indicator ${aqiData.class}`;
}


function getUVIndexText(uv) {
    if (uv <= 2) return 'Low';
    if (uv <= 5) return 'Moderate';
    if (uv <= 7) return 'High';
    if (uv <= 10) return 'Very High';
    return 'Extreme';
}
function getHumidityText(h) {
    if (h <= 30) return 'Dry';
    if (h <= 60) return 'Normal';
    return 'High';
}
function getVisibilityText(vis) {
    if (vis >= 10) return 'Excellent';
    if (vis >= 4) return 'Average';
    return 'Low / Foggy';
}
function getAQIValue(aqi) {
    if (aqi.pm2_5) return `PM2.5: ${Math.round(aqi.pm2_5)}`;
    if (aqi.pm10) return `PM10: ${Math.round(aqi.pm10)}`;
    return 'N/A';
}
function getAQIText(index) {
    // WeatherAPI returns 1-6 for us-epa-index (1 = Good, 6 = Hazardous)
    switch (index) {
        case 1: return { text: 'Good', class: 'aqi-good' };
        case 2: return { text: 'Moderate', class: 'aqi-moderate' };
        case 3: return { text: 'Unhealthy for Sensitive Groups', class: 'aqi-unhealthy' };
        case 4: return { text: 'Unhealthy', class: 'aqi-unhealthy' };
        case 5: return { text: 'Very Unhealthy', class: 'aqi-very-unhealthy' };
        case 6: return { text: 'Hazardous', class: 'aqi-hazardous' };
        default: return { text: 'Unknown', class: '' };
    }
}

/* 
   Fetch weather
 */
function fetchWeather(city = DEFAULT_CITY) {
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${encodeURIComponent(WEATHERAPI_KEY)}&q=${encodeURIComponent(city)}&days=1&aqi=yes&alerts=no`;
    fetch(url)
        .then(res => res.json())
        .then(data => {
            updateWeatherUI(data);
        })
        .catch(err => {
            console.error('Fetch error:', err);
            updateWeatherUI(null);
        });
}

/*
   DOM ready + search wiring
 */
document.addEventListener('DOMContentLoaded', () => {
    // initial load
    fetchWeather(DEFAULT_CITY);

    // search
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');

    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => {
            const city = searchInput.value.trim();
            if (city) fetchWeather(city);
        });
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const city = searchInput.value.trim();
                if (city) fetchWeather(city);
            }
        });
    }
});
// Sample forecast data (used to render the Forecast tab)
const forecastData = [
    { day: "Mon", temp: "29°C", condition: "Rainy", icon: "https://cdn-icons-png.flaticon.com/128/1163/1163624.png" },
    { day: "Tue", temp: "31°C", condition: "Sunny", icon: "https://cdn-icons-png.flaticon.com/128/1163/1163625.png" },
    { day: "Wed", temp: "28°C", condition: "Cloudy", icon: "https://cdn-icons-png.flaticon.com/128/1163/1163626.png" },
    { day: "Thu", temp: "27°C", condition: "Thunderstorm", icon: "https://cdn-icons-png.flaticon.com/128/1163/1163627.png" },
    { day: "Fri", temp: "30°C", condition: "Rainy", icon: "https://cdn-icons-png.flaticon.com/128/1163/1163624.png" },
    { day: "Sat", temp: "32°C", condition: "Sunny", icon: "https://cdn-icons-png.flaticon.com/128/1163/1163625.png" },
    { day: "Sun", temp: "28°C", condition: "Cloudy", icon: "https://cdn-icons-png.flaticon.com/128/1163/1163626.png" }
];

/**
 * Populate forecast cards into the Forecast tab.
 * This runs after DOMContentLoaded to ensure the container exists.
 */
function populateForecast(data = forecastData) {
    const forecastContainer = document.getElementById("forecast-container");
    if (!forecastContainer) return;

    // Clear previous cards
    forecastContainer.innerHTML = "";

    data.forEach(dayForecast => {
        const col = document.createElement("div");
        col.classList.add("col"); // optional if using flex, not bootstrap grid

        col.innerHTML = `
            <div class="forecast-card glass-effect">
                <p class="forecast-day">${dayForecast.day}</p>
                <img class="forecast-icon" src="${dayForecast.icon}" alt="${dayForecast.condition}">
                <p class="forecast-temp">${dayForecast.temp}</p>
                <p class="forecast-small">${dayForecast.condition}</p>
            </div>
        `;

        forecastContainer.appendChild(col);
    });
}

// If DOM already loaded, populate immediately, otherwise wait for DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => populateForecast());
} else {
    populateForecast();
}



