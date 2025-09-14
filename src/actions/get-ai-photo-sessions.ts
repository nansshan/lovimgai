'use server';

import { getDb } from '@/db';
import { aiPhotoSession } from '@/db/schema';
import type { User } from '@/lib/auth-types';
import { userActionClient } from '@/lib/safe-action';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';

// 定义查询参数的schema
const getAIPhotoSessionsSchema = z.object({
  limit: z.number().min(1).max(100).default(50), // 限制返回数量，默认50条
});

/**
 * 获取当前用户的AI图片编辑会话列表
 * 按照最后活动时间倒序排列
 */
export const getAIPhotoSessionsAction = userActionClient
  .schema(getAIPhotoSessionsSchema)
  .action(async ({ parsedInput, ctx }) => {
    try {
      const { limit } = parsedInput;
      const currentUser = (ctx as { user: User }).user;

      const db = await getDb();

      // 查询用户的会话列表，按最后活动时间倒序
      const sessions = await db
        .select({
          id: aiPhotoSession.id,
          title: aiPhotoSession.title,
          firstPrompt: aiPhotoSession.firstPrompt,
          taskCount: aiPhotoSession.taskCount,
          lastActivity: aiPhotoSession.lastActivity,
          createdAt: aiPhotoSession.createdAt,
        })
        .from(aiPhotoSession)
        .where(eq(aiPhotoSession.userId, currentUser.id))
        .orderBy(desc(aiPhotoSession.lastActivity))
        .limit(limit);

      // 转换数据格式以匹配前端期望的格式
      const formattedSessions = sessions.map((session) => ({
        id: session.id,
        title: session.title,
        firstPrompt: session.firstPrompt,
        taskCount: session.taskCount,
        lastActivity: session.lastActivity.toISOString(),
        createdAt: session.createdAt.toISOString(),
      }));

      return {
        success: true,
        data: formattedSessions,
      };
    } catch (error) {
      console.error('获取AI图片编辑会话列表失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取会话列表失败',
      };
    }
  });
