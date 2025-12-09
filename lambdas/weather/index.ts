import axios from 'axios';

interface WeatherResponse {
    location: string;
    temperature: number;
    feelsLike: number;
    heatIndex: number;
    dewpoint: number;
    condition: string;
    description: string;
    humidity: number;
    windSpeed: number;
    gust: number;
    pressure: number;
    icon: string;
    units: 'metric' | 'imperial';
}

interface LambdaEvent {
    queryStringParameters?: {
        lat?: string;
        lon?: string;
        city?: string;
        units?: 'metric' | 'imperial';
    };
    headers?: {
        'x-api-key'?: string;
    };
}

interface LambdaResponse {
    statusCode: number;
    headers: {
        'Content-Type': string;
        'Access-Control-Allow-Origin': string;
    };
    body: string;
}

/**
 * Lambda handler function for weather data
 * Accepts either lat/lon coordinates or city name
 */
export const handler = async (event: LambdaEvent): Promise<LambdaResponse> => {
    console.log('Weather Lambda triggered:', JSON.stringify(event, null, 2));

    try {
        // Validate API key - check both lowercase and original case (API Gateway normalizes to lowercase)
        const headers = event.headers || {};
        const apiKey = headers['x-api-key'] || headers['X-Api-Key'];
        const expectedApiKey = process.env.API_KEY;

        if (!apiKey || apiKey !== expectedApiKey) {
            return {
                statusCode: 401,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ error: 'Unauthorized' }),
            };
        }

        // Get location and units parameters
        const { lat, lon, city, units = 'imperial' } = event.queryStringParameters || {};
        const isMetric = units === 'metric';

        if (!lat && !lon && !city) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: 'Missing required parameters. Provide either lat/lon.'
                }),
            };
        }

        // Build OpenWeatherMap API URL
        const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
        let weatherUrl = 'https://api.weatherapi.com/v1/current.json?';

        if (lat && lon) {
            weatherUrl += `q=${lat},${lon}`;
        }

        weatherUrl += `&key=${WEATHER_API_KEY}`;

        // Fetch weather data from OpenWeatherMap
        console.log('Fetching weather data from WeatherAPI...');
        const response = await axios.get(weatherUrl);
        const data = response.data;

        // Transform the response to our format based on units preference
        const weatherData: WeatherResponse = {
            location: `${data.location.name}, ${data.location.country}`,
            temperature: Math.round(isMetric ? data.current.temp_c : data.current.temp_f),
            feelsLike: Math.round(isMetric ? data.current.feelslike_c : data.current.feelslike_f),
            heatIndex: Math.round(isMetric ? data.current.heatindex_c : data.current.heatindex_f),
            dewpoint: Math.round(isMetric ? data.current.dewpoint_c : data.current.dewpoint_f),
            condition: data.current.condition.text,
            description: data.current.condition.text,
            humidity: data.current.humidity,
            windSpeed: Math.round(isMetric ? data.current.wind_kph : data.current.wind_mph),
            gust: Math.round(isMetric ? data.current.gust_kph : data.current.gust_mph),
            pressure: isMetric ? data.current.pressure_mb : data.current.pressure_in,
            icon: data.current.condition.icon,
            units: units,
        };

        console.log('Weather data fetched successfully:', weatherData);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(weatherData),
        };

    } catch (error: any) {
        console.error('Error fetching weather data:', error);

        // Handle specific error cases
        if (error.response?.status === 404) {
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ error: 'Location not found' }),
            };
        }

        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: 'Failed to fetch weather data',
                message: error.message
            }),
        };
    }
};