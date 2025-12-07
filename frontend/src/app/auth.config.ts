import { AuthConfig } from '@auth0/auth0-angular';

export const authConfig: AuthConfig = {
    domain: 'dev-6sfjxompkc4vz884.us.auth0.com',  // e.g., 'dev-xxxxx.us.auth0.com'
    clientId: '3cUknJuXEju8xlwS9RIP4t1SAxrdJfw4',
    authorizationParams: {
        redirect_uri: window.location.origin + '/callback',
        audience: 'https://api-home.thisisvillegas.com',
    },
    httpInterceptor: {
        allowedList: [
            {
                uri: 'http://localhost:3000/api/*',
                tokenOptions: {
                    authorizationParams: {
                        audience: 'https://api-home.thisisvillegas.com',
                    }
                }
            },
            {
                uri: 'https://api-home.thisisvillegas.com/api/*',
                tokenOptions: {
                    authorizationParams: {
                        audience: 'https://api-home.thisisvillegas.com',
                    }
                }
            }
        ]
    }
};