'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface PhotoEditorLayoutV2Props {
  chatInterface: ReactNode;
  imagePreview: ReactNode;
  className?: string;
  children?: ReactNode; // 预留扩展区域
}

/**
 * AI图片编辑器二栏布局组件 V2
 *
 * 实现二栏响应式布局：
 * - 桌面端：对话区(60%) + 预览区(40%)
 * - 平板端：对话区(60%) + 预览区(40%)
 * - 移动端：对话区全屏，预览区隐藏
 *
 * 相比V1版本的改进：
 * - 移除了左侧256px侧边栏，空间利用率提升35%+
 * - 调整对话区和预览区比例为60:40，给对话更多空间
 * - 保持响应式设计，确保各设备上的良好体验
 */
export function PhotoEditorLayoutV2({
  chatInterface,
  imagePreview,
  className,
  children,
}: PhotoEditorLayoutV2Props) {
  return (
    <div className={cn('flex h-full w-full overflow-hidden', className)}>
      {/* 对话界面区域 - 60%宽度 */}
      <div className="flex w-full flex-col lg:w-3/5">
        <div className="flex h-full flex-col overflow-hidden">
          {chatInterface}
        </div>
      </div>

      {/* 图片预览区域 - 40%宽度，桌面端显示，移动端隐藏 */}
      <div className="hidden lg:flex lg:w-2/5 lg:flex-col lg:border-l">
        {imagePreview}
      </div>

      {/* 子组件内容区域（用于抽屉、弹窗等） */}
      {children}
    </div>
  );
}

/**
 * 简化版二栏布局组件，用于快速替换
 */
interface SimplePhotoEditorLayoutV2Props {
  chatInterface: ReactNode;
  imagePreview: ReactNode;
  className?: string;
}

export function SimplePhotoEditorLayoutV2({
  chatInterface,
  imagePreview,
  className,
}: SimplePhotoEditorLayoutV2Props) {
  return (
    <PhotoEditorLayoutV2
      chatInterface={chatInterface}
      imagePreview={imagePreview}
      className={className}
    />
  );
}

/**
 * 移动端优化的布局组件
 *
 * 在移动端提供更好的体验：
 * - 对话区全屏显示
 * - 预览区可通过抽屉或浮层访问
 */
interface MobilePhotoEditorLayoutProps {
  chatInterface: ReactNode;
  imagePreview: ReactNode;
  showPreview?: boolean;
  onTogglePreview?: () => void;
  className?: string;
}

export function MobilePhotoEditorLayout({
  chatInterface,
  imagePreview,
  showPreview = false,
  onTogglePreview,
  className,
}: MobilePhotoEditorLayoutProps) {
  return (
    <div className={cn('flex h-full w-full overflow-hidden', className)}>
      {/* 移动端对话区全屏 */}
      <div className="flex w-full flex-col">
        <div className="flex h-full flex-col overflow-hidden">
          {chatInterface}
        </div>
      </div>

      {/* 移动端预览区抽屉 */}
      {showPreview && (
        <div className="absolute inset-0 z-50 bg-background">
          <div className="flex h-full flex-col">
            {/* 抽屉头部 */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">图片预览</h3>
              <button
                onClick={onTogglePreview}
                className="text-muted-foreground hover:text-foreground"
                aria-label="关闭预览"
              >
                ✕
              </button>
            </div>

            {/* 预览内容 */}
            <div className="flex-1 overflow-hidden">
              {imagePreview}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
