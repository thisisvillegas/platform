import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
Sentry.init({
    dsn: process.env.SENTRY_DSN || '',
    environment: process.env.NODE_ENV || 'development',

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Profiling
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
        nodeProfilingIntegration(),
    ],

    // Release tracking
    release: 'platform-backend@1.0.0',

    // Enhanced error context
    beforeSend(event, hint) {
        // Log errors in development
        if (process.env.NODE_ENV !== 'production') {
            console.log('Sentry event (dev mode):', event);
        }
        return event;
    },
});