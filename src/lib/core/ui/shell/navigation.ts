import type { AppRouteId } from './section-metadata';
import { APP_SECTIONS } from './section-metadata';

export interface AppRouteMeta {
  label: string;
  href: AppRouteId;
  title: string;
  description: string;
  showInDesktopNav?: boolean;
  showInMobileNav?: boolean;
}

export const APP_ROUTES: AppRouteMeta[] = APP_SECTIONS.map((section) => ({
  label: section.label,
  href: section.href,
  title: section.title,
  description: section.navDescription,
  showInDesktopNav: section.showInDesktopNav,
  showInMobileNav: section.showInMobileNav,
}));

export const DESKTOP_NAV_ROUTES = APP_ROUTES.filter((route) => route.showInDesktopNav);
export const MOBILE_NAV_ROUTES = APP_ROUTES.filter((route) => route.showInMobileNav);

export function documentTitleFor(title: string): string {
  return `Personal Health Cockpit · ${title}`;
}
