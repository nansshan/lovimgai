'use client';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { MessageSquareIcon } from 'lucide-react';
import { useLocale } from 'next-intl';

export interface EditSession {
  id: string;
  title: string;
  firstPrompt?: string | null;
  taskCount: number;
  lastActivity: string; // ISO string
  createdAt: string; // ISO string
}

interface RecentEditListProps {
  sessions: EditSession[];
  currentSessionId?: string;
  onSessionSelect: (sessionId: string) => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * 历史编辑会话列表组件
 *
 * 显示用户的编辑会话历史，支持：
 * - 显示会话标题（第一条prompt的前10字符）
 * - 显示最后活动时间
 * - 当前会话高亮显示
 * - 点击切换会话
 */
export function RecentEditList({
  sessions,
  currentSessionId,
  onSessionSelect,
  isLoading = false,
  className,
}: RecentEditListProps) {
  const locale = useLocale();

  if (isLoading) {
    return (
      <div className={cn('flex flex-col space-y-2', className)}>
        <div className="text-sm font-medium text-muted-foreground px-2">
          最近编辑
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-12 rounded-md bg-muted/50 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-8', className)}>
        <MessageSquareIcon className="size-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground text-center">
          还没有编辑会话
          <br />
          点击"新建对话"开始
        </p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="text-sm font-medium text-muted-foreground px-2 mb-2">
        最近编辑
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1">
          {sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              isActive={currentSessionId === session.id}
              onSelect={() => onSessionSelect(session.id)}
              locale={locale}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface SessionItemProps {
  session: EditSession;
  isActive: boolean;
  onSelect: () => void;
  locale: string;
}

function SessionItem({ session, isActive, onSelect, locale }: SessionItemProps) {
  // 生成显示标题：优先使用title，fallback到firstPrompt的前10字符
  const displayTitle = session.title ||
    (session.firstPrompt ?
      (session.firstPrompt.length > 10 ?
        session.firstPrompt.substring(0, 10) + '...' :
        session.firstPrompt
      ) :
      '新建对话'
    );

  // 格式化时间
  const timeAgo = formatDistanceToNow(new Date(session.lastActivity), {
    addSuffix: true,
    locale: locale === 'zh' ? zhCN : undefined,
  });

  return (
    <Button
      variant="ghost"
      onClick={onSelect}
      className={cn(
        'w-full h-auto p-3 justify-start text-left hover:bg-muted/50',
        'flex flex-col items-start space-y-1',
        isActive && 'bg-muted border-l-2 border-l-primary'
      )}
    >
      <div className="flex items-center justify-between w-full">
        <span className="font-medium text-sm truncate flex-1">
          {displayTitle}
        </span>
        <span className="text-xs text-muted-foreground shrink-0 ml-2">
          {session.taskCount}
        </span>
      </div>
      <span className="text-xs text-muted-foreground">
        {timeAgo}
      </span>
    </Button>
  );
}

/**
 * 空状态占位符
 */
export function RecentEditListSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="h-4 bg-muted/50 rounded animate-pulse" />
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 bg-muted/30 rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}
