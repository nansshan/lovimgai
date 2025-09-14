'use client';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { DownloadIcon, ImageIcon, ZoomInIcon } from 'lucide-react';
import { useState } from 'react';

export interface ImageItem {
  id: string;
  url: string;
  prompt: string;
  createdAt: string; // ISO string
  status: 'generating' | 'completed' | 'failed';
}

interface ImagePreviewPanelProps {
  images: ImageItem[];
  selectedImageId?: string;
  onImageSelect: (imageId: string) => void;
  onImageDownload?: (imageUrl: string, prompt: string) => void;
  isGenerating?: boolean;
  className?: string;
}

/**
 * AI图片预览面板组件
 *
 * 布局：
 * - 主图预览区域：85%高度
 * - 缩略图列表区域：15%高度
 *
 * 功能：
 * - 显示当前会话生成的图片
 * - 点击缩略图切换主图
 * - 支持图片下载
 * - 显示生成状态
 */
export function ImagePreviewPanel({
  images,
  selectedImageId,
  onImageSelect,
  onImageDownload,
  isGenerating = false,
  className,
}: ImagePreviewPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 获取当前选中的图片
  const selectedImage = selectedImageId
    ? images.find(img => img.id === selectedImageId)
    : images[0];

  // 过滤已完成的图片
  const completedImages = images.filter(img => img.status === 'completed');

  const handleDownload = () => {
    if (selectedImage && onImageDownload) {
      onImageDownload(selectedImage.url, selectedImage.prompt);
    }
  };

  return (
    <div className={cn('flex h-full flex-col bg-background', className)}>
      {/* 主图预览区域 - 85% */}
      <div className="flex-1 relative min-h-0" style={{ flexBasis: '85%' }}>
        {selectedImage ? (
          <div className="relative h-full w-full">
            {/* 图片容器 */}
            <div className="absolute inset-0 flex items-center justify-center bg-muted/10">
              <img
                src={selectedImage.url}
                alt={selectedImage.prompt}
                className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>

            {/* 操作按钮 */}
            <div className="absolute top-4 right-4 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsFullscreen(true)}
                className="bg-background/80 backdrop-blur-sm"
              >
                <ZoomInIcon className="size-4" />
              </Button>

              {onImageDownload && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDownload}
                  className="bg-background/80 backdrop-blur-sm"
                >
                  <DownloadIcon className="size-4" />
                </Button>
              )}
            </div>

            {/* 图片信息 */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-background/90 backdrop-blur-sm rounded-lg p-3 space-y-1">
                <div className="text-sm font-medium truncate">
                  {selectedImage.prompt}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(selectedImage.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <EmptyPreview isGenerating={isGenerating} />
        )}
      </div>

      {/* 缩略图列表区域 - 15% */}
      <div className="border-t bg-muted/5" style={{ flexBasis: '15%', minHeight: '120px' }}>
        <div className="h-full p-3">
          <ScrollArea className="h-full">
            <div className="flex gap-2">
              {/* 生成中占位符 */}
              {isGenerating && (
                <div className="shrink-0">
                  <div className="size-16 rounded-md bg-muted/50 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                    <div className="size-4 rounded-full bg-primary/30 animate-pulse" />
                  </div>
                  <div className="text-xs text-center mt-1 text-muted-foreground">
                    生成中...
                  </div>
                </div>
              )}

              {/* 图片缩略图 */}
              {completedImages.map((image) => (
                <ThumbnailItem
                  key={image.id}
                  image={image}
                  isSelected={selectedImageId === image.id}
                  onSelect={() => onImageSelect(image.id)}
                />
              ))}

              {/* 空状态提示 */}
              {completedImages.length === 0 && !isGenerating && (
                <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                  <div className="text-center">
                    <ImageIcon className="size-6 mx-auto mb-2 opacity-50" />
                    <div className="text-xs">还没有生成的图片</div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

interface ThumbnailItemProps {
  image: ImageItem;
  isSelected: boolean;
  onSelect: () => void;
}

function ThumbnailItem({ image, isSelected, onSelect }: ThumbnailItemProps) {
  return (
    <div className="shrink-0">
      <button
        onClick={onSelect}
        className={cn(
          'size-16 rounded-md overflow-hidden border-2 transition-all hover:scale-105',
          isSelected
            ? 'border-primary shadow-md'
            : 'border-transparent hover:border-muted-foreground/30'
        )}
      >
        <img
          src={image.url}
          alt={image.prompt}
          className="w-full h-full object-cover"
        />
      </button>

      {/* 图片序号 */}
      <div className="text-xs text-center mt-1 text-muted-foreground">
        {image.id.slice(-4)}
      </div>
    </div>
  );
}

interface EmptyPreviewProps {
  isGenerating: boolean;
}

function EmptyPreview({ isGenerating }: EmptyPreviewProps) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center space-y-4">
        {isGenerating ? (
          <>
            <div className="size-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <div className="size-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">正在生成图片</h3>
              <p className="text-muted-foreground text-sm">
                请稍等，AI正在为你创作...
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="size-16 mx-auto rounded-full bg-muted/20 flex items-center justify-center">
              <ImageIcon className="size-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">开始创作</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                在左侧对话框中描述你想要的图片，生成的结果将在这里显示
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
