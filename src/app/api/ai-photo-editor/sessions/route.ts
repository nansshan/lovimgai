import { randomUUID } from 'crypto';
import { getDb } from '@/db';
import { aiPhotoSession } from '@/db/schema';
import { getSession } from '@/lib/server';
import { desc, eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * 创建新的AI图片编辑会话（智能创建逻辑）
 *
 * 逻辑：
 * 1. 查询用户的会话列表
 * 2. 如果列表为空，创建新会话
 * 3. 如果列表不为空，检查最新会话的taskCount
 *    - 如果taskCount为0，返回该会话（避免创建空会话）
 *    - 如果taskCount不为0，创建新会话
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户认证
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const db = await getDb();

    // 1. 查询用户的会话列表（按最后活动时间倒序，获取最新的一条）
    const existingSessions = await db
      .select({
        id: aiPhotoSession.id,
        taskCount: aiPhotoSession.taskCount,
        lastActivity: aiPhotoSession.lastActivity,
      })
      .from(aiPhotoSession)
      .where(eq(aiPhotoSession.userId, userId))
      .orderBy(desc(aiPhotoSession.lastActivity))
      .limit(1);

    // 2. 如果有会话且最新会话的任务数为0，则返回该会话
    if (existingSessions.length > 0 && existingSessions[0].taskCount === 0) {
      const existingSession = existingSessions[0];
      console.log(`返回现有空会话: ${existingSession.id}`);

      return NextResponse.json({
        success: true,
        sessionId: existingSession.id,
        isNewSession: false, // 标记这是复用的会话
      });
    }

    // 3. 创建新会话（列表为空 或 最新会话已有任务）
    const sessionId = randomUUID();
    const now = new Date();

    await db.insert(aiPhotoSession).values({
      id: sessionId,
      userId: userId,
      title: '新建对话', // 默认标题，后续会根据第一条prompt更新
      firstPrompt: null,
      taskCount: 0,
      lastActivity: now,
      createdAt: now,
      updatedAt: now,
    });

    console.log(`创建新会话: ${sessionId}`);

    return NextResponse.json({
      success: true,
      sessionId: sessionId,
      isNewSession: true, // 标记这是新创建的会话
    });
  } catch (error) {
    console.error('Create session error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 获取用户的会话列表
 */
export async function GET(request: NextRequest) {
  try {
    // 验证用户认证
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 查询用户的会话列表
    const db = await getDb();
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
      .where(eq(aiPhotoSession.userId, userId))
      .orderBy(desc(aiPhotoSession.lastActivity))
      .limit(50); // 限制返回最近50个会话

    return NextResponse.json({
      success: true,
      sessions: sessions.map((session) => ({
        id: session.id,
        title: session.title,
        firstPrompt: session.firstPrompt,
        taskCount: session.taskCount,
        lastActivity: session.lastActivity.toISOString(),
        createdAt: session.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
