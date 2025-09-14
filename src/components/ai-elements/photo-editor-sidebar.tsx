'use client';

import { RippleButton } from '@/components/magicui/ripple-button';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { ModeToggle, type EditorMode } from './mode-toggle';
import { RecentEditList, type EditSession } from './recent-edit-list';

interface PhotoEditorSidebarProps {
  currentSessionId?: string;
  currentMode: EditorMode;
  sessions: EditSession[];
  isLoadingSessions?: boolean;
  onSessionChange: (sessionId: string) => void;
  onNewSession: () => void;
  onModeChange: (mode: EditorMode) => void;
  className?: string;
}

/**
 * AI图片编辑器侧边栏组件
 *
 * 包含：
 * - 新建会话按钮（带Ripple动画效果）
 * - Chat/Canvas模式切换
 * - 历史会话列表
 */
export function PhotoEditorSidebar({
  currentSessionId,
  currentMode,
  sessions,
  isLoadingSessions = false,
  onSessionChange,
  onNewSession,
  onModeChange,
  className,
}: PhotoEditorSidebarProps) {
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  const handleNewSession = async () => {
    try {
      setIsCreatingSession(true);
      await onNewSession();
    } finally {
      setIsCreatingSession(false);
    }
  };

  return (
    <div className={cn('flex h-full w-full flex-col bg-background', className)}>
      {/* 顶部区域 - 新建会话按钮 */}
      <div className="p-4 border-b">
        <RippleButton
          onClick={handleNewSession}
          disabled={isCreatingSession}
          className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
          rippleColor="rgba(255, 255, 255, 0.3)"
        >
          <PlusIcon className="size-4 mr-2" />
          {isCreatingSession ? '创建中...' : '新建对话'}
        </RippleButton>
      </div>

      {/* 模式切换区域 */}
      <div className="p-4">
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">
            编辑模式
          </div>
          <ModeToggle
            currentMode={currentMode}
            onModeChange={onModeChange}
          />
        </div>
      </div>

      <Separator />

      {/* 会话列表区域 */}
      <div className="flex-1 overflow-hidden p-4">
        <RecentEditList
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSessionSelect={onSessionChange}
          isLoading={isLoadingSessions}
          className="h-full"
        />
      </div>

      {/* 底部信息区域 */}
      <div className="p-4 border-t">
        <div className="text-xs text-muted-foreground text-center space-y-1">
          <div>AI图片编辑器</div>
          <div>当前模式：{currentMode === 'chat' ? '对话模式' : 'Canvas模式'}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * 紧凑版侧边栏（用于移动端抽屉）
 */
interface CompactPhotoEditorSidebarProps {
  currentSessionId?: string;
  sessions: EditSession[];
  onSessionChange: (sessionId: string) => void;
  onNewSession: () => void;
  onClose?: () => void;
  className?: string;
}

export function CompactPhotoEditorSidebar({
  currentSessionId,
  sessions,
  onSessionChange,
  onNewSession,
  onClose,
  className,
}: CompactPhotoEditorSidebarProps) {
  return (
    <div className={cn('flex h-full w-full flex-col bg-background', className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">编辑会话</h3>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        )}
      </div>

      {/* 新建按钮 */}
      <div className="p-4">
        <Button
          onClick={onNewSession}
          className="w-full"
          variant="outline"
        >
          <PlusIcon className="size-4 mr-2" />
          新建对话
        </Button>
      </div>

      <Separator />

      {/* 会话列表 */}
      <div className="flex-1 overflow-hidden p-4">
        <RecentEditList
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSessionSelect={(sessionId) => {
            onSessionChange(sessionId);
            onClose?.();
          }}
          className="h-full"
        />
      </div>
    </div>
  );
}
