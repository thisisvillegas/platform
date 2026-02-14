import { ApplicationConfig, ErrorHandler, provideZoneChangeDetection } from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { provideAuth0 } from "@auth0/auth0-angular";
import { authHttpInterceptorFn } from "@auth0/auth0-angular";
import * as Sentry from "@sentry/angular";

import { routes } from "./app.routes";
import { authConfig } from "./auth.config";

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authHttpInterceptorFn])
    ),
    provideAuth0(authConfig),
    {
      provide: ErrorHandler,
      useValue: Sentry.createErrorHandler({
        showDialog: false,
      }),
    },
  ]
};
