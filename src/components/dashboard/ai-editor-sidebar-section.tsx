'use client';

import { ModeToggle } from '@/components/ai-elements/mode-toggle';
import { RecentEditList } from '@/components/ai-elements/recent-edit-list';
import { RippleButton } from '@/components/magicui/ripple-button';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import { useLocalePathname } from '@/i18n/navigation';
import { Routes } from '@/routes';
import { useAIEditorStore } from '@/stores/ai-editor-store';
import { PlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

/**
 * AI编辑器侧边栏内容组件
 *
 * 功能特性：
 * - 基于路径的条件渲染，仅在AI编辑器页面显示
 * - 集成新建对话按钮、模式切换、最近编辑列表
 * - 连接AIEditorStore实现全局状态管理
 * - 复用现有组件，保持UI一致性
 */
export function AIEditorSidebarSection() {
  const pathname = useLocalePathname();
  const t = useTranslations('Dashboard.aiPhotoEditor');
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // 路径检测：仅在AI编辑器页面显示
  const isAIEditorPage = pathname === Routes.AIPhotoEditor;

  // 连接AIEditorStore状态
  const {
    sessions,
    currentSessionId,
    currentMode,
    setCurrentSession,
    addSession,
    setMode,
  } = useAIEditorStore();

  // 如果不在AI编辑器页面，不渲染任何内容
  if (!isAIEditorPage) return null;

  // 新建会话处理
  const handleNewSession = async () => {
    try {
      setIsCreatingSession(true);

      // 创建新会话
      const newSession = {
        id: `session-${Date.now()}`,
        title: '新建对话',
        firstPrompt: null,
        taskCount: 0,
        lastActivity: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      // 添加到store
      addSession(newSession);

      console.log('新建会话:', newSession.id);
    } catch (error) {
      console.error('创建会话失败:', error);
    } finally {
      setIsCreatingSession(false);
    }
  };

  // 会话切换处理
  const handleSessionChange = (sessionId: string) => {
    console.log('切换会话:', sessionId);
    setCurrentSession(sessionId);
  };

  // 模式切换处理
  const handleModeChange = (mode: typeof currentMode) => {
    console.log('切换模式:', mode);
    setMode(mode);
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>AI图片编辑</SidebarGroupLabel>
      <SidebarGroupContent className="flex flex-col gap-4">
        {/* 新建对话按钮 */}
        <div className="px-2">
          <RippleButton
            onClick={handleNewSession}
            disabled={isCreatingSession}
            className="w-full h-9 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
            rippleColor="rgba(255, 255, 255, 0.3)"
          >
            <PlusIcon className="size-4 mr-2" />
            {isCreatingSession ? '创建中...' : '新建对话'}
          </RippleButton>
        </div>

        {/* 模式切换 */}
        <div className="px-2 space-y-2">
          <div className="text-xs font-medium text-muted-foreground">
            编辑模式
          </div>
          <ModeToggle
            currentMode={currentMode}
            onModeChange={handleModeChange}
            className="w-full"
          />
        </div>

        {/* 最近编辑列表 */}
        <div className="flex-1 min-h-0">
          <RecentEditList
            sessions={sessions}
            currentSessionId={currentSessionId}
            onSessionSelect={handleSessionChange}
            className="h-full"
          />
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

/**
 * 紧凑版AI编辑器侧边栏内容组件
 *
 * 用于侧边栏折叠状态或移动端显示
 */
export function CompactAIEditorSidebarSection() {
  const pathname = useLocalePathname();
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // 路径检测
  const isAIEditorPage = pathname === Routes.AIPhotoEditor;

  // 连接状态
  const {
    sessions,
    currentSessionId,
    currentMode,
    setCurrentSession,
    addSession,
    setMode,
  } = useAIEditorStore();

  if (!isAIEditorPage) return null;

  // 新建会话处理（简化版）
  const handleNewSession = async () => {
    try {
      setIsCreatingSession(true);

      const newSession = {
        id: `session-${Date.now()}`,
        title: '新建对话',
        firstPrompt: null,
        taskCount: 0,
        lastActivity: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      addSession(newSession);
    } catch (error) {
      console.error('创建会话失败:', error);
    } finally {
      setIsCreatingSession(false);
    }
  };

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        {/* 紧凑版新建按钮 */}
        <RippleButton
          onClick={handleNewSession}
          disabled={isCreatingSession}
          className="w-full h-8 text-xs"
          rippleColor="rgba(255, 255, 255, 0.3)"
        >
          <PlusIcon className="size-3" />
        </RippleButton>

        {/* 会话数量指示 */}
        <div className="text-xs text-center text-muted-foreground">
          {sessions.length}
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
