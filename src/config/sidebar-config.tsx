'use client';

import { Routes } from '@/routes';
import type { NestedMenuItem } from '@/types';
import { ImageIcon, LayoutDashboardIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * Get sidebar config with translations
 *
 * NOTICE: used in client components only
 *
 * docs:
 * https://mksaas.com/docs/config/sidebar
 *
 * @returns The sidebar config with translated titles and descriptions
 */
export function getSidebarLinks(): NestedMenuItem[] {
  const t = useTranslations('Dashboard');

  return [
    {
      title: t('dashboard.title'),
      icon: <LayoutDashboardIcon className="size-4 shrink-0" />,
      href: Routes.Dashboard,
      external: false,
    },
    {
      title: t('aiPhotoEditor.title'),
      icon: <ImageIcon className="size-4 shrink-0" />,
      href: Routes.AIPhotoEditor,
      external: false,
    },
  ];
}
