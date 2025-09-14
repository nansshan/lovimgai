'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type EditorMode = 'chat' | 'canvas';

interface ModeToggleProps {
  currentMode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  className?: string;
}

/**
 * 编辑器模式切换组件
 *
 * Chat模式：可用，对话式图片生成
 * Canvas模式：禁用，显示"Coming Soon"
 */
export function ModeToggle({
  currentMode,
  onModeChange,
  className,
}: ModeToggleProps) {
  return (
    <div className={cn('flex rounded-lg border p-1', className)}>
      {/* Chat模式按钮 */}
      <Button
        variant={currentMode === 'chat' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('chat')}
        className={cn(
          'flex-1 h-8 text-xs font-medium transition-all',
          currentMode === 'chat' && 'shadow-sm'
        )}
      >
        Chat
      </Button>

      {/* Canvas模式按钮 - 禁用状态 */}
      <div className="relative flex-1">
        <Button
          variant="ghost"
          size="sm"
          disabled
          className={cn(
            'w-full h-8 text-xs font-medium opacity-50 cursor-not-allowed',
            'hover:bg-transparent hover:text-muted-foreground'
          )}
        >
          Canvas
        </Button>

        {/* Coming Soon标识 */}
        <div className="absolute -top-1 -right-1">
          <div className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
            Soon
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 简化的模式显示组件（只读）
 */
interface ModeDisplayProps {
  currentMode: EditorMode;
  className?: string;
}

export function ModeDisplay({ currentMode, className }: ModeDisplayProps) {
  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <div className="flex items-center gap-1">
        <div className="size-2 rounded-full bg-green-500" />
        <span className="font-medium capitalize">{currentMode}</span>
      </div>
      {currentMode === 'chat' && (
        <span className="text-muted-foreground">对话模式</span>
      )}
    </div>
  );
}
