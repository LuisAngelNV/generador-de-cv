import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guards';
import { leaveEditorGuard } from './features/cv-editor/leave-editor.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'Generador de CV',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  {
    path: 'login',
    title: 'Iniciar sesión · Generador de CV',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    title: 'Crear cuenta · Generador de CV',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
  },
  {
    path: 'cvs',
    title: 'Mis CVs · Generador de CV',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'cvs/:id',
    title: 'Editar CV · Generador de CV',
    canActivate: [authGuard],
    canDeactivate: [leaveEditorGuard],
    loadComponent: () => import('./features/cv-editor/cv-editor').then((m) => m.CvEditor),
  },
  {
    path: '**',
    title: 'Página no encontrada · Generador de CV',
    loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFound),
  },
];
