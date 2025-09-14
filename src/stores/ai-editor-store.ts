import { getAIPhotoSessionsAction } from '@/actions/get-ai-photo-sessions';
import type { ChatMessage } from '@/components/ai-elements/chat-interface';
import type { ImageItem } from '@/components/ai-elements/image-preview-panel';
import type { EditorMode } from '@/components/ai-elements/mode-toggle';
import type { EditSession } from '@/components/ai-elements/recent-edit-list';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * AI编辑器状态接口
 */
interface AIEditorState {
  // 会话管理
  sessions: EditSession[];
  currentSessionId?: string;

  // 编辑模式
  currentMode: EditorMode;

  // 对话数据
  messages: ChatMessage[];

  // 图片数据
  images: ImageItem[];
  selectedImageId?: string;

  // UI状态
  isGenerating: boolean;

  // Loading状态
  isLoadingSessions: boolean;
  isCreatingSession: boolean;

  // 初始化标记
  hasInitializedSessions: boolean;
}

/**
 * AI编辑器操作接口
 */
interface AIEditorActions {
  // 会话管理
  setCurrentSession: (id: string) => void;
  setCurrentSessionId: (id: string) => void; // 添加简单的ID设置方法
  addSession: (session: EditSession) => void;
  updateSession: (id: string, updates: Partial<EditSession>) => void;
  removeSession: (id: string) => void;
  setSessions: (sessions: EditSession[]) => void; // 新增方法

  // 异步会话操作
  loadSessions: (limit?: number) => Promise<boolean>;
  createNewSession: () => Promise<string | null>;

  // 初始化方法
  initializeSessions: (limit?: number) => Promise<boolean>;

  // 模式切换
  setMode: (mode: EditorMode) => void;

  // 消息管理
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearMessages: () => void;

  // 图片管理
  addImage: (image: ImageItem) => void;
  updateImage: (id: string, updates: Partial<ImageItem>) => void;
  selectImage: (id?: string) => void;
  clearImages: () => void;

  // UI状态管理
  setGenerating: (generating: boolean) => void;

  // 重置功能
  clearCurrentSession: () => void;
  resetStore: () => void;
}

/**
 * 初始状态（清空演示数据，改为空状态）
 */
const initialState: AIEditorState = {
  sessions: [], // 移除硬编码的演示数据
  currentSessionId: undefined, // 初始没有选中的会话
  currentMode: 'chat',
  messages: [],
  images: [],
  selectedImageId: undefined,
  isGenerating: false,
  isLoadingSessions: false,
  isCreatingSession: false,
  hasInitializedSessions: false,
};

/**
 * AI编辑器全局状态管理Store
 *
 * 使用Zustand管理AI图片编辑器的所有状态，包括：
 * - 会话管理（sessions, currentSessionId）
 * - 编辑模式（currentMode）
 * - 对话数据（messages）
 * - 图片数据（images, selectedImageId）
 * - UI状态（isGenerating）
 * - 异步数据获取（loadSessions, createNewSession）
 *
 * 支持状态持久化，会话数据会自动保存到localStorage
 */
export const useAIEditorStore = create<AIEditorState & AIEditorActions>()(
  persist(
    (set, get) => ({
      // 初始状态
      ...initialState,

      // 异步会话操作
      loadSessions: async (limit = 50): Promise<boolean> => {
        try {
          const result = await getAIPhotoSessionsAction({ limit });

          if (result?.data?.success && result.data.data) {
            // 转换数据格式以匹配EditSession类型
            const sessions: EditSession[] = result.data.data.map((session) => ({
              id: session.id,
              title: session.title,
              firstPrompt: session.firstPrompt,
              taskCount: session.taskCount,
              lastActivity: session.lastActivity,
              createdAt: session.createdAt,
            }));

            set({ sessions });
            return true;
          }

          console.error('获取会话列表失败:', result?.data?.error);
          return false;
        } catch (error) {
          console.error('加载会话列表失败:', error);
          return false;
        }
      },

      createNewSession: async (): Promise<string | null> => {
        try {
          set({ isCreatingSession: true });

          // 调用新建会话API
          const response = await fetch('/api/ai-photo-editor/sessions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
            throw new Error(data.error || `API请求失败: ${response.status}`);
          }

          // 创建成功后重新加载会话列表
          const loadSuccess = await get().loadSessions();
          if (loadSuccess) {
            // 设置新创建的会话为当前会话
            get().setCurrentSession(data.sessionId);
            return data.sessionId;
          }

          return null;
        } catch (error) {
          console.error('创建会话失败:', error);
          return null;
        } finally {
          set({ isCreatingSession: false });
        }
      },

      // 初始化方法
      initializeSessions: async (limit = 50): Promise<boolean> => {
        try {
          set({ hasInitializedSessions: false }); // 确保标记为false
          set({ isLoadingSessions: true });

          const result = await get().loadSessions(limit);

          if (result) {
            set({ hasInitializedSessions: true });
            return true;
          }
          return false;
        } catch (error) {
          console.error('初始化会话失败:', error);
          return false;
        } finally {
          set({ isLoadingSessions: false });
        }
      },

      // 会话管理 Actions
      setCurrentSession: (id: string) => {
        const { sessions } = get();
        const session = sessions.find((s) => s.id === id);
        if (session) {
          set({
            currentSessionId: id,
            // 切换会话时清空当前消息和图片，实际应用中应该加载对应会话的数据
            messages: [],
            images: [],
            selectedImageId: undefined,
          });
        }
      },

      setCurrentSessionId: (id: string) => {
        set({ currentSessionId: id });
      },

      addSession: (session: EditSession) => {
        set((state) => ({
          sessions: [session, ...state.sessions],
          currentSessionId: session.id,
          // 新会话开始时清空消息和图片
          messages: [],
          images: [],
          selectedImageId: undefined,
        }));
      },

      updateSession: (id: string, updates: Partial<EditSession>) => {
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === id ? { ...session, ...updates } : session
          ),
        }));
      },

      removeSession: (id: string) => {
        set((state) => {
          const newSessions = state.sessions.filter((s) => s.id !== id);
          const newCurrentSessionId =
            state.currentSessionId === id
              ? newSessions.length > 0
                ? newSessions[0].id
                : undefined
              : state.currentSessionId;

          return {
            sessions: newSessions,
            currentSessionId: newCurrentSessionId,
            // 如果删除的是当前会话，清空相关数据
            ...(state.currentSessionId === id
              ? {
                  messages: [],
                  images: [],
                  selectedImageId: undefined,
                }
              : {}),
          };
        });
      },

      setSessions: (sessions: EditSession[]) => {
        set({ sessions });
      },

      // 模式切换 Actions
      setMode: (mode: EditorMode) => {
        set({ currentMode: mode });
      },

      // 消息管理 Actions
      addMessage: (message: ChatMessage) => {
        set((state) => ({
          messages: [...state.messages, message],
        }));

        // 更新当前会话的最后活动时间
        const { currentSessionId, updateSession } = get();
        if (currentSessionId) {
          updateSession(currentSessionId, {
            lastActivity: new Date().toISOString(),
          });
        }
      },

      updateMessage: (id: string, updates: Partial<ChatMessage>) => {
        set((state) => ({
          messages: state.messages.map((message) =>
            message.id === id ? { ...message, ...updates } : message
          ),
        }));
      },

      clearMessages: () => {
        set({ messages: [] });
      },

      // 图片管理 Actions
      addImage: (image: ImageItem) => {
        set((state) => ({
          images: [...state.images, image],
          // 自动选中新添加的图片
          selectedImageId: image.id,
        }));
      },

      updateImage: (id: string, updates: Partial<ImageItem>) => {
        set((state) => ({
          images: state.images.map((image) =>
            image.id === id ? { ...image, ...updates } : image
          ),
        }));
      },

      selectImage: (id?: string) => {
        set({ selectedImageId: id });
      },

      clearImages: () => {
        set({
          images: [],
          selectedImageId: undefined,
        });
      },

      // UI状态管理 Actions
      setGenerating: (generating: boolean) => {
        set({ isGenerating: generating });
      },

      // 重置功能 Actions
      clearCurrentSession: () => {
        set({
          messages: [],
          images: [],
          selectedImageId: undefined,
          isGenerating: false,
        });
      },

      resetStore: () => {
        set({ ...initialState, hasInitializedSessions: false });
      },
    }),
    {
      name: 'ai-editor-store', // localStorage key
      // 只持久化会话数据，其他状态每次重新初始化
      partialize: (state) => ({
        sessions: state.sessions,
        currentSessionId: state.currentSessionId,
        currentMode: state.currentMode,
      }),
    }
  )
);

/**
 * 便捷的状态选择器 Hooks
 */
export const useAIEditorSessions = () =>
  useAIEditorStore((state) => state.sessions);
export const useAIEditorCurrentSession = () =>
  useAIEditorStore((state) => state.currentSessionId);
export const useAIEditorMode = () =>
  useAIEditorStore((state) => state.currentMode);
export const useAIEditorMessages = () =>
  useAIEditorStore((state) => state.messages);
export const useAIEditorImages = () =>
  useAIEditorStore((state) => state.images);
export const useAIEditorGeneratingState = () =>
  useAIEditorStore((state) => state.isGenerating);
