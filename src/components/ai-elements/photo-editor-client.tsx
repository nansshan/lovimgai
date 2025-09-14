'use client';

import { useAIEditorStore } from '@/stores/ai-editor-store';
import { ChatInterface, type ChatMessage } from './chat-interface';
import { ImagePreviewPanel, type ImageItem } from './image-preview-panel';
import { PhotoEditorLayoutV2 } from './photo-editor-layout-v2';

/**
 * AI图片编辑器客户端组件 V2
 *
 * 重构后的版本：
 * - 使用AIEditorStore全局状态管理
 * - 使用PhotoEditorLayoutV2二栏布局
 * - 移除sidebar相关逻辑（已迁移到主侧边栏）
 * - 保持ChatInterface和ImagePreviewPanel功能完整
 */
export function PhotoEditorClient() {
  // 连接AIEditorStore全局状态
  const {
    messages,
    images,
    selectedImageId,
    isGenerating,
    currentSessionId,
    addMessage,
    addImage,
    selectImage,
    setGenerating,
    addSession
  } = useAIEditorStore();

  // 事件处理函数（重构后）
  // 注意：会话管理、模式切换等逻辑已迁移到主侧边栏的AIEditorSidebarSection

  const handleSendMessage = async (content: string, imageFiles?: File[]) => {
    console.log('发送消息:', content, imageFiles);

    if (!currentSessionId) {
      // 如果没有当前会话，先创建一个
      const newSession = {
        id: `session-${Date.now()}`,
        title: content.length > 10 ? content.substring(0, 10) + '...' : content,
        firstPrompt: content,
        taskCount: 0,
        lastActivity: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      addSession(newSession);
    }

    // 添加用户消息
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      type: 'user',
      content,
      images: imageFiles ? imageFiles.map(file => URL.createObjectURL(file)) : undefined,
      timestamp: new Date().toISOString(),
      status: 'completed',
    };

    addMessage(userMessage);
    setGenerating(true);

    // TODO: 调用AI API
    // 模拟AI响应
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        type: 'assistant',
        content: '图片正在生成中，请稍候...',
        timestamp: new Date().toISOString(),
        status: 'processing',
      };
      addMessage(aiMessage);

      // 模拟生成完成
      setTimeout(() => {
        // TODO: 这里应该使用updateMessage方法
        const updatedMessage: ChatMessage = {
          ...aiMessage,
          content: '图片生成完成！',
          status: 'completed',
        };
        // 临时方案：重新添加消息（实际应用中应该使用updateMessage）
        setGenerating(false);
      }, 3000);
    }, 1000);
  };

  const handleStopGeneration = () => {
    console.log('停止生成');
    setGenerating(false);
  };

  const handleImageSelect = (imageId: string) => {
    console.log('选择图片:', imageId);
    selectImage(imageId);
  };

  const handleImageDownload = (imageUrl: string, prompt: string) => {
    console.log('下载图片:', imageUrl, prompt);
    // TODO: 实现图片下载
  };

  return (
    <PhotoEditorLayoutV2
      chatInterface={
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          onStopGeneration={handleStopGeneration}
          isGenerating={isGenerating}
        />
      }
      imagePreview={
        <ImagePreviewPanel
          images={images}
          selectedImageId={selectedImageId}
          onImageSelect={handleImageSelect}
          onImageDownload={handleImageDownload}
          isGenerating={isGenerating}
        />
      }
    />
  );
}
