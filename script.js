const GEOCODING_API = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_API = "https://api.open-meteo.com/v1/forecast";


const form = document.getElementById("form");
const cityInput = document.getElementById("city");
const searchBtn = document.getElementById("searchBtn");
const statusMessage = document.getElementById("status");
const currentWeather = document.getElementById("currentWeather");
const forecast = document.getElementById("forecast");
const unitToggle = document.getElementById("unitToggle");

let currentUnit = "C";

function convertTemperature(temp) {
    if (currentUnit === "F") {
        return (temp * 9 / 5) + 32;
    }

    return temp;
}

function formatTemperature(temp) {
    return `${convertTemperature(temp).toFixed(1)}°${currentUnit}`;
}



const weatherCodes = {
    0: "Clear Sky",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Cloudy",
    45: "Fog",
    48: "Depositing Rime Fog",
    51: "Light Drizzle",
    53: "Moderate Drizzle",
    55: "Dense Drizzle",
    61: "Slight Rain",
    63: "Moderate Rain",
    65: "Heavy Rain",
    71: "Slight Snow",
    73: "Moderate Snow",
    75: "Heavy Snow",
    80: "Rain Showers",
    81: "Moderate Rain Showers",
    82: "Heavy Rain Showers",
    95: "Thunderstorm",
    96: "Thunderstorm with Hail",
    99: "Heavy Thunderstorm with Hail"
};

function getWeatherIcon(code) {
    if (code === 0) return "☀️";
    if (code === 1) return "🌤️";
    if (code === 2) return "⛅";
    if (code === 3) return "☁️";

    if (code === 45 || code === 48) return "🌫️";

    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
        return "🌧️";
    }

    if ([71, 73, 75].includes(code)) return "❄️";

    if ([95, 96, 99].includes(code)) return "⛈️";

    return "🌡️";
}


function getWeatherDescription(code) {
    return weatherCodes[code] || "Unknown Weather";
}

async function findCity(name) {
    const url = `${GEOCODING_API}?name=${encodeURIComponent(name)}&count=1&language=en&format=json`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("The city search service is not responding.");
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
        throw new Error("City not found. Please enter a valid city name.");
    }

    const city = data.results[0];

    return {
        name: city.name,
        country: city.country,
        latitude: city.latitude,
        longitude: city.longitude
    };
}

async function getWeather(latitude, longitude) {
    const url = `${WEATHER_API}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=5&timezone=auto`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Could not load the weather forecast.");
    }

    return await response.json();
}


function displayCurrentWeather(city, weather) {
    currentWeather.replaceChildren();

    const card = document.createElement("div");
    card.className = "weather-card";

    const cityName = document.createElement("h2");
    cityName.textContent = city.country
    ? `${city.name}, ${city.country}`
    : city.name;

    const icon = document.createElement("p");
    icon.className = "weather-icon";
    icon.textContent = getWeatherIcon(weather.current.weather_code);

    const temperature = document.createElement("p");
    temperature.className = "temperature";
    temperature.textContent = formatTemperature(
        weather.current.temperature_2m
    );

    const condition = document.createElement("p");
    condition.className = "condition";
    condition.textContent = getWeatherDescription(
        weather.current.weather_code
    );

    const feelsLike = document.createElement("p");
    feelsLike.textContent =
        `Feels like: ${formatTemperature(weather.current.apparent_temperature)}`;

    const humidity = document.createElement("p");
    humidity.textContent =
        `Humidity: ${weather.current.relative_humidity_2m}%`;

    const wind = document.createElement("p");
    wind.textContent =
        `Wind Speed: ${weather.current.wind_speed_10m} km/h`;

    card.append(
        cityName,
        icon,
        temperature,
        condition,
        feelsLike,
        humidity,
        wind
    );

    currentWeather.appendChild(card);
}

function displayForecast(weather) {
    forecast.replaceChildren();

    for (let i = 0; i < weather.daily.time.length; i++) {
        const card = document.createElement("div");
        card.className = "forecast-card";

        const date = document.createElement("h3");

        const formattedDate = new Date(
            weather.daily.time[i] + "T00:00:00"
        );

        date.textContent = formattedDate.toLocaleDateString(
            "en-IN",
            {
                day: "numeric",
                month: "short",
                weekday: "short"
            }
        );

        const icon = document.createElement("p");
        icon.className = "forecast-icon";
        icon.textContent = getWeatherIcon(
            weather.daily.weather_code[i]
        );

        const condition = document.createElement("p");
        condition.textContent = getWeatherDescription(
            weather.daily.weather_code[i]
        );

        const maxTemp = document.createElement("p");
        maxTemp.textContent =
            `Max: ${formatTemperature(weather.daily.temperature_2m_max[i])}`;

        const minTemp = document.createElement("p");
        minTemp.textContent =
            `Min: ${formatTemperature(weather.daily.temperature_2m_min[i])}`;

        card.append(date, icon, condition, maxTemp, minTemp);
        forecast.appendChild(card);
    }
}



let lastWeather = null;
let lastSearchedCity = null;

unitToggle.addEventListener("click", function () {
    currentUnit = currentUnit === "C" ? "F" : "C";

    unitToggle.textContent =
        currentUnit === "C" ? "Switch to °F" : "Switch to °C";

    if (lastWeather && lastSearchedCity) {
        displayCurrentWeather(lastSearchedCity, lastWeather);
        displayForecast(lastWeather);
    }
});



form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const cityName = cityInput.value.trim();

    if (!cityName) {
        statusMessage.textContent = "Please enter a city name.";
        return;
    }

    searchBtn.disabled = true;
    statusMessage.textContent = "Loading weather...";

    currentWeather.replaceChildren();
    forecast.replaceChildren();

    try {
        const city = await findCity(cityName);

        const weather = await getWeather(
            city.latitude,
            city.longitude
        );

        lastSearchedCity = city;
        lastWeather = weather;

        displayCurrentWeather(city, weather);
        displayForecast(weather);

        statusMessage.textContent = "Weather updated successfully!";

        localStorage.setItem("lastCity", city.name);

    } catch (error) {
        lastWeather = null;
        lastSearchedCity = null;

        if (error instanceof TypeError) {
            statusMessage.textContent =
                "Network problem. Please check your internet connection.";
        } else {
            statusMessage.textContent = error.message;
        }

    } finally {
        searchBtn.disabled = false;
    }
});


const lastCity = localStorage.getItem("lastCity");

if (lastCity) {
    cityInput.value = lastCity;
    form.requestSubmit();
}

const locationBtn = document.getElementById("locationBtn");

locationBtn.addEventListener("click", function () {

    if (!navigator.geolocation) {
        statusMessage.textContent =
            "Geolocation is not supported by your browser.";
        return;
    }

    locationBtn.disabled = true;
    statusMessage.textContent = "Detecting your location...";

    navigator.geolocation.getCurrentPosition(
        async function (position) {
            try {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;

                statusMessage.textContent = "Loading local weather...";

                const weather = await getWeather(latitude, longitude);

                const city = {
                    name: "Your Location",
                    country: ""
                };

                lastSearchedCity = city;
                lastWeather = weather;

                displayCurrentWeather(city, weather);
                displayForecast(weather);

                statusMessage.textContent =
                    "Your location weather loaded successfully!";

            } catch (error) {
                statusMessage.textContent =
                    "Unable to load weather. Please try again.";
            } finally {
                locationBtn.disabled = false;
            }
        },

        function (error) {
            if (error.code === 1) {
                statusMessage.textContent =
                    "Location permission denied. Please allow location access.";
            } else {
                statusMessage.textContent =
                    "Unable to detect your location.";
            }

            locationBtn.disabled = false;
        },

        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        }
    );
});
