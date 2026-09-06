import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: "",
    title: "OpenMW Dev Docs | Lua Scripting Guides",
    loadComponent: () => import("./pages/home/home").then((m) => m.Home),
  },
  {
    path: 'docs',
    title: 'OpenMW Lua documentation',
    data: { slug: '' },
    loadComponent: () => import('./pages/docs/docs-page').then((m) => m.DocsPage),
  },
  {
    path: 'docs/:slug',
    title: 'OpenMW Lua documentation',
    loadComponent: () => import('./pages/docs/docs-page').then((m) => m.DocsPage),
  },
];
