import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { useAuth } from './auth/AuthProvider';
import { LoginPage } from './auth/LoginPage';
import { ClientDetailPage } from './features/clients/ClientDetailPage';
import { ClientsPage } from './features/clients/ClientsPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { MastersPage } from './features/masters/MastersPage';
import { ProjectDetailPage } from './features/projects/ProjectDetailPage';
import { ProjectsPage } from './features/projects/ProjectsPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { AppShell } from './shell/AppShell';

function Root() {
  const { user } = useAuth();
  // Auth gate at the root: signed-out visitors see the login screen at any URL, and land back there after sign-in.
  if (!user) return <LoginPage />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

const rootRoute = createRootRoute({ component: Root });

const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: DashboardPage });
const clientsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/clients', component: ClientsPage });
const projectsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/projects', component: ProjectsPage });
const mastersRoute = createRoute({ getParentRoute: () => rootRoute, path: '/masters', component: MastersPage });
const settingsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/settings', component: SettingsPage });
export const clientDetailRoute = createRoute({ getParentRoute: () => rootRoute, path: '/clients/$id', component: ClientDetailPage });
export const projectDetailRoute = createRoute({ getParentRoute: () => rootRoute, path: '/projects/$id', component: ProjectDetailPage });
export const mastersKindRoute = createRoute({ getParentRoute: () => rootRoute, path: '/masters/$kind', component: MastersPage });

const routeTree = rootRoute.addChildren([
  indexRoute,
  clientsRoute,
  clientDetailRoute,
  projectsRoute,
  projectDetailRoute,
  mastersRoute,
  mastersKindRoute,
  settingsRoute,
]);

export const router = createRouter({ routeTree, defaultPreload: 'intent' });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
