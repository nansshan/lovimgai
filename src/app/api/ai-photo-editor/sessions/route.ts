import { randomUUID } from 'crypto';
import { getDb } from '@/db';
import { aiPhotoSession } from '@/db/schema';
import { getSession } from '@/lib/server';
import { desc, eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * 创建新的AI图片编辑会话
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
    const sessionId = randomUUID();
    const now = new Date();

    // 创建新会话
    const db = await getDb();
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

    return NextResponse.json({
      success: true,
      sessionId: sessionId,
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
