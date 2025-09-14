'use client';

import { isDemoWebsite } from '@/lib/demo';
import { Routes } from '@/routes';
import type { NestedMenuItem } from '@/types';
import {
  BellIcon,
  CircleUserRoundIcon,
  CoinsIcon,
  CreditCardIcon,
  LockKeyholeIcon,
  UsersRoundIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { websiteConfig } from './website';

/**
 * Get user menu links for dropdown menu
 *
 * 用户弹框菜单配置，包含：
 * - Admin功能（仅有权限用户可见）
 * - Settings功能（所有用户可见）
 *
 * @param userRole - 当前用户角色
 * @returns The user menu links with translated titles and descriptions
 */
export function getUserMenuLinks(userRole?: string): NestedMenuItem[] {
  const t = useTranslations('Dashboard');

  // if is demo website, allow user to access admin and user pages, but data is fake
  const isDemo = isDemoWebsite();

  const menuItems: NestedMenuItem[] = [];

  // Admin功能组 - 仅Admin用户或演示模式可见
  const showAdminFeatures =
    userRole === 'admin' ||
    (isDemo && (userRole === 'admin' || userRole === 'user'));
  if (showAdminFeatures) {
    menuItems.push({
      title: t('admin.title'),
      icon: <UsersRoundIcon className="size-4 shrink-0" />,
      href: Routes.AdminUsers, // 直接链接到用户管理页面
      external: false,
    });
  }

  // Settings功能组 - 所有用户可见
  const settingsItems: NestedMenuItem[] = [
    {
      title: t('settings.profile.title'),
      icon: <CircleUserRoundIcon className="size-4 shrink-0" />,
      href: Routes.SettingsProfile,
      external: false,
    },
    {
      title: t('settings.billing.title'),
      icon: <CreditCardIcon className="size-4 shrink-0" />,
      href: Routes.SettingsBilling,
      external: false,
    },
    {
      title: t('settings.security.title'),
      icon: <LockKeyholeIcon className="size-4 shrink-0" />,
      href: Routes.SettingsSecurity,
      external: false,
    },
    {
      title: t('settings.notification.title'),
      icon: <BellIcon className="size-4 shrink-0" />,
      href: Routes.SettingsNotifications,
      external: false,
    },
  ];

  // 如果启用了积分功能，添加积分页面
  if (websiteConfig.credits.enableCredits) {
    settingsItems.splice(2, 0, {
      title: t('settings.credits.title'),
      icon: <CoinsIcon className="size-4 shrink-0" />,
      href: Routes.SettingsCredits,
      external: false,
    });
  }

  menuItems.push(...settingsItems);

  return menuItems;
}

/**
 * Get admin menu links only
 * 仅获取Admin相关链接
 */
export function getAdminMenuLinks(userRole?: string): NestedMenuItem[] {
  const t = useTranslations('Dashboard');
  const isDemo = isDemoWebsite();

  const showAdminFeatures =
    userRole === 'admin' ||
    (isDemo && (userRole === 'admin' || userRole === 'user'));

  if (showAdminFeatures) {
    return [
      {
        title: t('admin.title'),
        icon: <UsersRoundIcon className="size-4 shrink-0" />,
        href: Routes.AdminUsers,
        external: false,
      },
    ];
  }

  return [];
}

/**
 * Get settings menu links only
 * 仅获取Settings相关链接
 */
export function getSettingsMenuLinks(): NestedMenuItem[] {
  const t = useTranslations('Dashboard');

  const settingsItems: NestedMenuItem[] = [
    {
      title: t('settings.profile.title'),
      icon: <CircleUserRoundIcon className="size-4 shrink-0" />,
      href: Routes.SettingsProfile,
      external: false,
    },
    {
      title: t('settings.billing.title'),
      icon: <CreditCardIcon className="size-4 shrink-0" />,
      href: Routes.SettingsBilling,
      external: false,
    },
    {
      title: t('settings.security.title'),
      icon: <LockKeyholeIcon className="size-4 shrink-0" />,
      href: Routes.SettingsSecurity,
      external: false,
    },
    {
      title: t('settings.notification.title'),
      icon: <BellIcon className="size-4 shrink-0" />,
      href: Routes.SettingsNotifications,
      external: false,
    },
  ];

  // 如果启用了积分功能，添加积分页面
  if (websiteConfig.credits.enableCredits) {
    settingsItems.splice(2, 0, {
      title: t('settings.credits.title'),
      icon: <CoinsIcon className="size-4 shrink-0" />,
      href: Routes.SettingsCredits,
      external: false,
    });
  }

  return settingsItems;
}
