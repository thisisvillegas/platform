import { Routes } from '@angular/router';
import { AuthGuard } from '@auth0/auth0-angular';

export const routes: Routes = [
    {
        path: '',
        redirectTo: '/login',
        pathMatch: 'full'
    },
    {
        path: 'login',
        loadComponent: () => import('./pages/landing/landing.component').then(m => m.LandingComponent)
    },
    {
        path: 'door',
        redirectTo: '/login',
        pathMatch: 'full'
    },
    {
        path: 'world',
        loadComponent: () => import('./game/game.component').then(m => m.GameComponent),
        title: 'Platform - World'
    },
    {
        path: 'callback',
        loadComponent: () => import('./pages/callback/callback.component').then(m => m.CallbackComponent)
    },
    {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
        canActivate: [AuthGuard]
    },
    {
        path: 'preferences',
        loadComponent: () => import('./pages/preferences/preferences.component').then(m => m.PreferencesComponent),
        canActivate: [AuthGuard]
    },
    {
        path: 'brain-dump',
        loadComponent: () => import('./pages/brain-dump/brain-dump.component').then(m => m.BrainDumpComponent),
        canActivate: [AuthGuard]
    },
    {
        path: 'homecontrol',
        loadComponent: () => import('./pages/homecontrol/homecontrol.component').then(m => m.HomecontrolComponent),
        canActivate: [AuthGuard]
    },
    {
        path: 'rootine',
        loadComponent: () => import('./pages/rootine/rootine.component').then(m => m.RootineComponent),
        canActivate: [AuthGuard]
    },
    {
        path: 'tactiqal',
        loadComponent: () => import('./pages/tactiqal/tactiqal.component').then(m => m.TactiqalComponent),
        canActivate: [AuthGuard]
    },
    {
        path: 'server',
        loadComponent: () => import('./pages/server/server.component').then(m => m.ServerComponent),
        canActivate: [AuthGuard]
    },
    {
        path: '**',
        redirectTo: '/login'
    }
];
