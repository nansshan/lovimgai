'use client';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ImageIcon, SendIcon, StopCircleIcon } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useState, type KeyboardEvent } from 'react';
import { toast } from 'sonner';

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[];
  timestamp: string; // ISO string
  status?: 'sending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (content: string, images?: File[]) => void;
  onStopGeneration?: () => void;
  isGenerating?: boolean;
  placeholder?: string;
  maxImages?: number;
  disabled?: boolean;
  className?: string;
}

/**
 * AI图片编辑器对话界面组件
 *
 * 功能：
 * - 显示对话消息历史
 * - 支持文本和图片输入
 * - 显示生成状态和进度
 * - 支持停止生成
 */
export function ChatInterface({
  messages,
  onSendMessage,
  onStopGeneration,
  isGenerating = false,
  placeholder = '描述你想要生成的图片...',
  maxImages = 5,
  disabled = false,
  className,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const locale = useLocale();

  const handleSend = () => {
    if (!input.trim() && selectedImages.length === 0) return;
    if (disabled || isGenerating) return;

    onSendMessage(input.trim(), selectedImages.length > 0 ? selectedImages : undefined);
    setInput('');
    setSelectedImages([]);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // 文件验证和过滤
    const validImages: File[] = [];
    const maxSizeInMB = 50;
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

    for (const file of files) {
      // 检查文件类型
      if (!file.type.startsWith('image/')) {
        toast.error(`文件 "${file.name}" 不是有效的图片格式`);
        continue;
      }

      // 检查文件大小
      if (file.size > maxSizeInBytes) {
        toast.error(`文件 "${file.name}" 大小超过 ${maxSizeInMB}MB 限制`);
        continue;
      }

      validImages.push(file);
    }

    // 检查总数量限制
    if (validImages.length + selectedImages.length > maxImages) {
      toast.error(`最多只能选择 ${maxImages} 张图片`);
      return;
    }

    // 添加有效图片
    if (validImages.length > 0) {
      setSelectedImages(prev => [...prev, ...validImages]);
      toast.success(`成功添加 ${validImages.length} 张图片`);
    }

    // 清空input值，允许重复选择同一文件
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* 消息展示区域 */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-4 p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
                <div className="size-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <ImageIcon className="size-6 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">开始创作</h3>
                <p className="text-muted-foreground text-sm max-w-sm">
                  描述你想要的图片，我将使用AI为你生成。你也可以上传参考图片。
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  locale={locale}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* 输入区域 */}
      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="p-4 space-y-3">
          {/* 已选择的图片预览 */}
          {selectedImages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedImages.map((file, index) => (
                <div key={index} className="relative group">
                  <div className="relative overflow-hidden rounded-lg border bg-muted/50">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Selected ${index + 1}`}
                      className="w-16 h-16 object-cover transition-transform group-hover:scale-105"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-1 -right-1 size-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center shadow-sm hover:bg-destructive/90 transition-colors"
                      title="删除图片"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground text-center truncate max-w-16">
                    {(file.size / 1024 / 1024).toFixed(1)}MB
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 输入框容器 */}
          <div className="relative">
            <div className="flex items-end gap-2 p-3 border rounded-lg bg-background focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
              {/* 图片上传按钮 */}
              <div className="relative group flex-shrink-0">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  disabled={disabled || selectedImages.length >= maxImages}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={disabled || selectedImages.length >= maxImages}
                  className={cn(
                    "size-8 p-0 transition-all duration-200",
                    "hover:bg-muted/50 hover:scale-105",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                    selectedImages.length >= maxImages && "opacity-40"
                  )}
                  title={selectedImages.length >= maxImages ? `最多选择${maxImages}张图片` : "上传图片"}
                >
                  <ImageIcon className="size-4 text-muted-foreground" />
                </Button>
              </div>

              {/* 输入框 */}
              <div className="flex-1 min-w-0">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  disabled={disabled}
                  className={cn(
                    "min-h-[40px] max-h-[120px] resize-none border-none p-0 shadow-none focus-visible:ring-0",
                    "placeholder:text-muted-foreground/70 bg-transparent",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                  rows={1}
                />
              </div>

              {/* 发送/停止按钮 */}
              <div className="flex-shrink-0">
                {isGenerating ? (
                  <Button
                    onClick={onStopGeneration}
                    variant="destructive"
                    size="sm"
                    className={cn(
                      "size-8 p-0 transition-all duration-200",
                      "hover:scale-105 active:scale-95",
                      "animate-pulse"
                    )}
                    title="停止生成"
                  >
                    <StopCircleIcon className="size-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSend}
                    disabled={disabled || (!input.trim() && selectedImages.length === 0)}
                    size="sm"
                    className={cn(
                      "size-8 p-0 transition-all duration-200",
                      "hover:scale-105 active:scale-95",
                      "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                      (!input.trim() && selectedImages.length === 0) ?
                        "bg-muted text-muted-foreground hover:bg-muted" :
                        "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                    title={(!input.trim() && selectedImages.length === 0) ? "请输入内容或选择图片" : "发送消息"}
                  >
                    <SendIcon className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  locale: string;
}

function MessageBubble({ message, locale }: MessageBubbleProps) {
  const timeAgo = formatDistanceToNow(new Date(message.timestamp), {
    addSuffix: true,
    locale: locale === 'zh' ? zhCN : undefined,
  });

  const isUser = message.type === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'max-w-[80%] rounded-lg p-3 space-y-2',
        isUser
          ? 'bg-primary text-primary-foreground ml-12'
          : 'bg-muted mr-12'
      )}>
        {/* 图片 */}
        {message.images && message.images.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {message.images.map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`Message image ${index + 1}`}
                className="rounded-md max-w-full h-auto"
              />
            ))}
          </div>
        )}

        {/* 文本内容 */}
        <div className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </div>

        {/* 状态和时间 */}
        <div className="flex items-center justify-between text-xs opacity-70">
          <span>{timeAgo}</span>
          {message.status && (
            <span className={cn(
              'capitalize',
              message.status === 'failed' && 'text-destructive',
              message.status === 'processing' && 'text-orange-500'
            )}>
              {message.status === 'sending' && '发送中'}
              {message.status === 'processing' && '生成中'}
              {message.status === 'completed' && '已完成'}
              {message.status === 'failed' && '失败'}
            </span>
          )}
        </div>

        {/* 错误信息 */}
        {message.error && (
          <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
            {message.error}
          </div>
        )}
      </div>
    </div>
  );
}
