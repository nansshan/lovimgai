import { getDb } from '@/db';
import { aiPhotoSession } from '@/db/schema';
import { getSession } from '@/lib/server';
import { and, eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

interface UpdateSessionRequest {
  title?: string;
  lastActivity?: string;
}

/**
 * 更新会话信息
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证用户认证
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: sessionId } = await params;
    const userId = session.user.id;

    // 解析请求体
    const body: UpdateSessionRequest = await request.json();
    const { title, lastActivity } = body;

    if (!title && !lastActivity) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    // 构建更新数据
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (title) {
      updateData.title = title;
    }

    if (lastActivity) {
      updateData.lastActivity = new Date(lastActivity);
    }

    // 更新会话（只能更新自己的会话）
    const db = await getDb();
    const result = await db
      .update(aiPhotoSession)
      .set(updateData)
      .where(
        and(eq(aiPhotoSession.id, sessionId), eq(aiPhotoSession.userId, userId))
      )
      .returning({ id: aiPhotoSession.id });

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId: result[0].id,
    });
  } catch (error) {
    console.error('Update session error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 获取单个会话详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证用户认证
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: sessionId } = await params;
    const userId = session.user.id;

    // 查询会话详情
    const db = await getDb();
    const sessionData = await db
      .select()
      .from(aiPhotoSession)
      .where(
        and(eq(aiPhotoSession.id, sessionId), eq(aiPhotoSession.userId, userId))
      )
      .limit(1);

    if (sessionData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    const sessionInfo = sessionData[0];

    return NextResponse.json({
      success: true,
      session: {
        id: sessionInfo.id,
        title: sessionInfo.title,
        firstPrompt: sessionInfo.firstPrompt,
        taskCount: sessionInfo.taskCount,
        lastActivity: sessionInfo.lastActivity.toISOString(),
        createdAt: sessionInfo.createdAt.toISOString(),
        updatedAt: sessionInfo.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Get session error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
