'use client';

import { useAIEditorStore } from '@/stores/ai-editor-store';
import { ChatInterface, type ChatMessage } from './chat-interface';
import { ImagePreviewPanel, type ImageItem } from './image-preview-panel';
import { PhotoEditorLayoutV2 } from './photo-editor-layout-v2';
import { toast } from 'sonner';
import { DEFAULT_MODEL_ID } from '@/config/ai-models-config';

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
    addSession,
    setCurrentSessionId,
    updateMessage
  } = useAIEditorStore();

  // 事件处理函数（重构后）
  // 注意：会话管理、模式切换等逻辑已迁移到主侧边栏的AIEditorSidebarSection

  const handleSendMessage = async (content: string, imageFiles?: File[], modelId: string = DEFAULT_MODEL_ID) => {
    console.log('发送消息:', content, imageFiles, modelId);

    if (isGenerating) return;

    try {
      setGenerating(true);

      // 确保有当前会话
      let sessionId = currentSessionId;
      if (!sessionId) {
        console.log('创建新会话...');
        const createSessionResponse = await fetch('/api/ai-photo-editor/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!createSessionResponse.ok) {
          throw new Error('创建会话失败');
        }

        const sessionData = await createSessionResponse.json();
        if (!sessionData.success) {
          throw new Error(sessionData.error || '创建会话失败');
        }

                 sessionId = sessionData.sessionId;
         setCurrentSessionId(sessionId!);

         // 同时添加到本地store
         const newSession = {
           id: sessionId!,
           title: content.length > 10 ? content.substring(0, 10) + '...' : content,
           firstPrompt: content,
           taskCount: 0,
           lastActivity: new Date().toISOString(),
           createdAt: new Date().toISOString(),
         };
         addSession(newSession);
        console.log('新会话创建成功:', sessionId);
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

      // 添加AI处理中消息
      const aiMessageId = `msg-${Date.now() + 1}`;
      const aiMessage: ChatMessage = {
        id: aiMessageId,
        type: 'assistant',
        content: '正在处理您的请求...',
        timestamp: new Date().toISOString(),
        status: 'processing',
      };
      addMessage(aiMessage);

      // 处理输入图片（如果有）
      let inputImageUrls: string[] | undefined;
      if (imageFiles && imageFiles.length > 0) {
        // TODO: 实现图片上传到存储服务
        // 目前暂时跳过图片上传，直接使用空数组
        inputImageUrls = [];
        console.log('注意：图片上传功能尚未实现，将不包含输入图片');
      }

      // 调用AI处理API
      console.log('调用AI处理API...');
      const processResponse = await fetch('/api/ai-photo-editor/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          prompt: content,
          inputImages: inputImageUrls,
          modelId,
        }),
      });

      const processData = await processResponse.json();

      if (!processResponse.ok || !processData.success) {
        throw new Error(processData.error || `API请求失败: ${processResponse.status}`);
      }

      console.log('AI处理请求提交成功，任务ID:', processData.taskId);

      // 更新AI消息状态
      updateMessage(aiMessageId, {
        content: '图片生成已开始，请稍候...',
        status: 'processing',
      });

      // 轮询任务状态
      const taskId = processData.taskId;
      pollTaskStatus(taskId, aiMessageId);

    } catch (error) {
      console.error('发送消息失败:', error);
      setGenerating(false);

      const errorMessage = error instanceof Error ? error.message : '发送失败，请重试';
      toast.error(errorMessage);

      // 如果有AI消息，更新为错误状态
      const aiMessages = messages.filter(m => m.type === 'assistant' && m.status === 'processing');
      if (aiMessages.length > 0) {
        const lastAiMessage = aiMessages[aiMessages.length - 1];
                 updateMessage(lastAiMessage.id, {
           content: `处理失败: ${errorMessage}`,
           status: 'failed',
           error: errorMessage,
         });
      }
    }
  };

  // 轮询任务状态
  const pollTaskStatus = async (taskId: string, aiMessageId: string) => {
    const maxAttempts = 60; // 最多轮询5分钟（每5秒一次）
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        console.log(`轮询任务状态 (${attempts}/${maxAttempts}):`, taskId);

        const statusResponse = await fetch(`/api/ai-photo-editor/tasks/${taskId}`);
        const statusData = await statusResponse.json();

        if (!statusResponse.ok || !statusData.success) {
          throw new Error(statusData.error || '获取任务状态失败');
        }

        const task = statusData.task;
        console.log('任务状态:', task.status);

        switch (task.status) {
          case 'completed':
            // 任务完成
            setGenerating(false);
            updateMessage(aiMessageId, {
              content: '图片生成完成！',
              status: 'completed',
            });

            // 添加生成的图片到图片列表
            if (task.outputImageUrl) {
                             const newImage: ImageItem = {
                 id: `img-${Date.now()}`,
                 url: task.outputImageUrl,
                 prompt: task.prompt,
                 createdAt: new Date().toISOString(),
                 status: 'completed',
               };
              addImage(newImage);
              toast.success('图片生成成功！');
            }
            return;

          case 'failed':
            // 任务失败
            setGenerating(false);
            const errorMsg = task.errorMessage || '图片生成失败';
                         updateMessage(aiMessageId, {
               content: `生成失败: ${errorMsg}`,
               status: 'failed',
               error: errorMsg,
             });
            toast.error(errorMsg);
            return;

          case 'processing':
          case 'pending':
            // 继续轮询
            if (attempts < maxAttempts) {
              setTimeout(poll, 5000); // 5秒后再次轮询
            } else {
              // 超时
              setGenerating(false);
                             updateMessage(aiMessageId, {
                 content: '生成超时，请稍后查看结果',
                 status: 'failed',
                 error: '任务处理超时',
               });
              toast.error('任务处理超时，请稍后查看结果');
            }
            break;

          default:
            console.warn('未知的任务状态:', task.status);
            if (attempts < maxAttempts) {
              setTimeout(poll, 5000);
            }
        }
      } catch (error) {
        console.error('轮询任务状态失败:', error);
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000); // 出错也继续轮询
        } else {
          setGenerating(false);
                     updateMessage(aiMessageId, {
             content: '无法获取生成状态',
             status: 'failed',
             error: '状态查询失败',
           });
        }
      }
    };

    // 开始轮询
    setTimeout(poll, 2000); // 2秒后开始第一次轮询
  };

  const handleStopGeneration = () => {
    console.log('停止生成');
    setGenerating(false);
    // TODO: 实现停止AI生成的API调用
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
