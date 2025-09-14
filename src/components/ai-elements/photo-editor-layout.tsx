'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface PhotoEditorLayoutProps {
  children?: ReactNode;
  sidebar: ReactNode;
  chatInterface: ReactNode;
  imagePreview: ReactNode;
  className?: string;
}

/**
 * AI图片编辑器主布局组件
 *
 * 实现三栏响应式布局：
 * - 桌面端：侧边栏(256px) + 对话区(50%) + 预览区(50%)
 * - 平板端：对话区 + 预览区(各50%)，侧边栏折叠为抽屉
 * - 移动端：单栏布局，对话区全屏，其他区域为抽屉模式
 */
export function PhotoEditorLayout({
  children,
  sidebar,
  chatInterface,
  imagePreview,
  className,
}: PhotoEditorLayoutProps) {
  return (
    <div className={cn('flex h-screen w-full overflow-hidden', className)}>
      {/* 侧边栏区域 - 桌面端固定显示，平板/移动端隐藏 */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:bg-muted/10">
        {sidebar}
      </div>

      {/* 主内容区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 对话界面区域 */}
        <div className="flex w-full flex-col lg:w-1/2">
          <div className="flex h-full flex-col overflow-hidden">
            {chatInterface}
          </div>
        </div>

        {/* 图片预览区域 - 桌面端显示，平板/移动端隐藏 */}
        <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:border-l">
          {imagePreview}
        </div>
      </div>

      {/* 子组件内容区域（用于抽屉等） */}
      {children}
    </div>
  );
}

/**
 * 简化版布局组件，用于快速原型
 */
interface SimplePhotoEditorLayoutProps {
  sidebar: ReactNode;
  chatInterface: ReactNode;
  imagePreview: ReactNode;
  className?: string;
}

export function SimplePhotoEditorLayout({
  sidebar,
  chatInterface,
  imagePreview,
  className,
}: SimplePhotoEditorLayoutProps) {
  return (
    <PhotoEditorLayout
      sidebar={sidebar}
      chatInterface={chatInterface}
      imagePreview={imagePreview}
      className={className}
    >
      {/* 预留扩展区域 */}
      <></>
    </PhotoEditorLayout>
  );
}
