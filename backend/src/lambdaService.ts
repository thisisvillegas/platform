import axios from 'axios';

interface WeatherParams {
    lat?: string;
    lon?: string;
    city?: string;
    units?: 'metric' | 'imperial';
}

interface RaceData {
    motogp: any[];
    f1: any[];
}

/**
 * Service class to handle all Lambda function calls
 * This centralizes Lambda integration and makes it easy to add new Lambda functions
 */
class LambdaService {

    /**
     * Call the Weather Lambda function
     */
    async getWeather(params: WeatherParams) {
        try {
            const weatherUrl = process.env.WEATHER_LAMBDA_URL;
            const apiKey = process.env.WEATHER_LAMBDA_API_KEY;

            if (!weatherUrl || !apiKey) {
                throw new Error('Weather Lambda configuration missing');
            }

            // Build query string
            const queryParams = new URLSearchParams();
            if (params.lat && params.lon) {
                queryParams.append('lat', params.lat);
                queryParams.append('lon', params.lon);
            } else if (params.city) {
                queryParams.append('city', params.city);
            }
            if (params.units) {
                queryParams.append('units', params.units);
            }

            const url = `${weatherUrl}?${queryParams.toString()}`;

            console.log('Calling Weather Lambda:', url);

            const response = await axios.get(url, {
                headers: {
                    'x-api-key': apiKey,
                },
                timeout: 10000, // 10 second timeout
            });

            console.log('Weather Lambda response:', response.data);

            return response.data;
        } catch (error: any) {
            console.error('Error calling Weather Lambda:', error.message);

            if (error.response) {
                // Lambda returned an error response
                throw new Error(error.response.data.error || 'Weather service error');
            }

            // Network or other error
            throw new Error('Failed to connect to weather service');
        }
    }

    /**
     * Call the MotoGP Lambda function
     */
    async getMotoGPRaces() {
        try {
            const url = process.env.MOTOGP_LAMBDA_URL;
            const apiKey = process.env.MOTOGP_LAMBDA_API_KEY;

            if (!url || !apiKey) {
                console.warn('MotoGP Lambda not configured, returning empty data');
                return [];
            }

            const response = await axios.get(url, {
                headers: {
                    'x-api-key': apiKey,
                },
                timeout: 10000,
            });

            return response.data;
        } catch (error: any) {
            console.error('Error calling MotoGP Lambda:', error.message);
            return []; // Return empty array on error
        }
    }

    /**
     * Call the F1 Lambda function
     */
    async getF1Races() {
        try {
            const url = process.env.F1_LAMBDA_URL;
            const apiKey = process.env.F1_LAMBDA_API_KEY;

            if (!url || !apiKey) {
                console.warn('F1 Lambda not configured, returning empty data');
                return [];
            }

            const response = await axios.get(url, {
                headers: {
                    'x-api-key': apiKey,
                },
                timeout: 10000,
            });

            return response.data;
        } catch (error: any) {
            console.error('Error calling F1 Lambda:', error.message);
            return []; // Return empty array on error
        }
    }

    /**
     * Get all upcoming races (MotoGP + F1) in parallel
     */
    async getAllUpcomingRaces(): Promise<RaceData> {
        try {
            // Call both Lambda functions in parallel for better performance
            const [motogpRaces, f1Races] = await Promise.all([
                this.getMotoGPRaces(),
                this.getF1Races(),
            ]);

            return {
                motogp: motogpRaces,
                f1: f1Races,
            };
        } catch (error) {
            console.error('Error fetching all races:', error);
            throw error;
        }
    }

    /**
     * Upload file to S3 via File Handler Lambda
     */
    async uploadFile(file: Buffer, filename: string, userId: string) {
        try {
            const url = process.env.FILE_HANDLER_LAMBDA_URL;
            const apiKey = process.env.FILE_HANDLER_LAMBDA_API_KEY;

            if (!url || !apiKey) {
                throw new Error('File Handler Lambda configuration missing');
            }

            const response = await axios.post(
                url,
                {
                    action: 'upload',
                    file: file.toString('base64'),
                    filename,
                    userId,
                },
                {
                    headers: {
                        'x-api-key': apiKey,
                        'Content-Type': 'application/json',
                    },
                    timeout: 30000, // 30 second timeout for file uploads
                }
            );

            return response.data;
        } catch (error: any) {
            console.error('Error uploading file:', error.message);
            throw new Error('Failed to upload file');
        }
    }

    /**
     * Delete file from S3 via File Handler Lambda
     */
    async deleteFile(fileKey: string, userId: string) {
        try {
            const url = process.env.FILE_HANDLER_LAMBDA_URL;
            const apiKey = process.env.FILE_HANDLER_LAMBDA_API_KEY;

            if (!url || !apiKey) {
                throw new Error('File Handler Lambda configuration missing');
            }

            const response = await axios.post(
                url,
                {
                    action: 'delete',
                    fileKey,
                    userId,
                },
                {
                    headers: {
                        'x-api-key': apiKey,
                        'Content-Type': 'application/json',
                    },
                    timeout: 10000,
                }
            );

            return response.data;
        } catch (error: any) {
            console.error('Error deleting file:', error.message);
            throw new Error('Failed to delete file');
        }
    }
}

// Export singleton instance
export const lambdaService = new LambdaService();