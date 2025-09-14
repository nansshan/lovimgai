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
}

/**
 * AI编辑器操作接口
 */
interface AIEditorActions {
  // 会话管理
  setCurrentSession: (id: string) => void;
  addSession: (session: EditSession) => void;
  updateSession: (id: string, updates: Partial<EditSession>) => void;
  removeSession: (id: string) => void;

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
 * 初始状态（包含演示数据）
 */
const initialState: AIEditorState = {
  sessions: [
    {
      id: 'demo-session-1',
      title: '科幻城市景观',
      firstPrompt: '生成一个未来科幻城市的景观图片',
      taskCount: 3,
      lastActivity: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30分钟前
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2小时前
    },
    {
      id: 'demo-session-2',
      title: '可爱的小猫',
      firstPrompt: '画一只可爱的橘色小猫在阳光下睡觉',
      taskCount: 1,
      lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1天前
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
  ],
  currentSessionId: 'demo-session-1',
  currentMode: 'chat',
  messages: [
    {
      id: 'demo-msg-1',
      type: 'user',
      content: '生成一个未来科幻城市的景观图片',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      status: 'completed',
    },
    {
      id: 'demo-msg-2',
      type: 'assistant',
      content:
        '我为您生成了一个未来科幻城市的景观图片。这个城市有着高耸的摩天大楼、飞行汽车和霓虹灯装饰。',
      timestamp: new Date(Date.now() - 1000 * 60 * 29).toISOString(),
      status: 'completed',
    },
  ],
  images: [],
  selectedImageId: undefined,
  isGenerating: false,
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
 *
 * 支持状态持久化，会话数据会自动保存到localStorage
 */
export const useAIEditorStore = create<AIEditorState & AIEditorActions>()(
  persist(
    (set, get) => ({
      // 初始状态
      ...initialState,

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
        set(initialState);
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
