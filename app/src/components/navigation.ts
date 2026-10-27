import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { fr } from '@/i18n/fr';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface NavItem {
  /** Route name inside the (main) tabs navigator. */
  name: string;
  href: '/' | '/week' | '/goals' | '/timeline' | '/stats' | '/review' | '/settings' | '/more';
  label: string;
  icon: IconName;
}

const today: NavItem = { name: 'index', href: '/', label: fr.nav.today, icon: 'today-outline' };
const week: NavItem = { name: 'week', href: '/week', label: fr.nav.week, icon: 'calendar-outline' };
const goals: NavItem = { name: 'goals', href: '/goals', label: fr.nav.goals, icon: 'git-network-outline' };
const timeline: NavItem = { name: 'timeline', href: '/timeline', label: fr.nav.timeline, icon: 'analytics-outline' };
const stats: NavItem = { name: 'stats', href: '/stats', label: fr.nav.stats, icon: 'stats-chart-outline' };
const review: NavItem = { name: 'review', href: '/review', label: fr.nav.review, icon: 'checkmark-done-outline' };
const settings: NavItem = { name: 'settings', href: '/settings', label: fr.nav.settings, icon: 'settings-outline' };
const more: NavItem = { name: 'more', href: '/more', label: fr.nav.more, icon: 'ellipsis-horizontal' };

/** Screens reachable from the mobile "Plus" menu. */
export const SECONDARY_ITEMS: readonly NavItem[] = [stats, review, settings];

/** Bottom tabs on mobile. */
export const MOBILE_ITEMS: readonly NavItem[] = [today, week, goals, timeline, more];

/** Sidebar on large screens: every top-level screen. */
export const WIDE_ITEMS: readonly NavItem[] = [today, week, goals, timeline, ...SECONDARY_ITEMS];
