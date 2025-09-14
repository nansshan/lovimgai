import { getDb } from '@/db';
import { aiPhotoTask } from '@/db/schema';
import { getSession } from '@/lib/server';
import { and, eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

interface GetTaskStatusResponse {
  success: boolean;
  task?: {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    prompt: string;
    inputImages?: string[];
    outputImageUrl?: string;
    errorMessage?: string;
    creditsCost: number;
    providerModel: string;
    sequenceOrder: number;
    createdAt: string;
    completedAt?: string;
  };
  error?: string;
}

/**
 * 查询任务状态
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
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

    const { taskId } = await params;
    const userId = session.user.id;

    // 查询任务信息（只能查询自己的任务）
    const db = await getDb();
    const taskData = await db
      .select()
      .from(aiPhotoTask)
      .where(and(eq(aiPhotoTask.id, taskId), eq(aiPhotoTask.userId, userId)))
      .limit(1);

    if (taskData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    const task = taskData[0];

    // 解析输入图片JSON
    let inputImages: string[] | undefined;
    if (task.inputImages) {
      try {
        inputImages = JSON.parse(task.inputImages as string);
      } catch (error) {
        console.error('Failed to parse input images:', error);
        inputImages = undefined;
      }
    }

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        status: task.status as
          | 'pending'
          | 'processing'
          | 'completed'
          | 'failed',
        prompt: task.prompt,
        inputImages: inputImages,
        outputImageUrl: task.outputImageUrl || undefined,
        errorMessage: task.errorMessage || undefined,
        creditsCost: task.creditsCost,
        providerModel: task.providerModel || '',
        sequenceOrder: task.sequenceOrder,
        createdAt: task.createdAt.toISOString(),
        completedAt: task.completedAt?.toISOString(),
      },
    } as GetTaskStatusResponse);
  } catch (error) {
    console.error('Get task status error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 更新任务状态（主要用于webhook回调）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;

    // 解析请求体
    const body = await request.json();
    const { status, outputImageUrl, errorMessage } = body;

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Status is required' },
        { status: 400 }
      );
    }

    // 更新任务状态
    const db = await getDb();
    const updateData: any = {
      status: status,
      updatedAt: new Date(),
    };

    if (outputImageUrl) {
      updateData.outputImageUrl = outputImageUrl;
    }

    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    if (status === 'completed' || status === 'failed') {
      updateData.completedAt = new Date();
    }

    const result = await db
      .update(aiPhotoTask)
      .set(updateData)
      .where(eq(aiPhotoTask.id, taskId))
      .returning({ id: aiPhotoTask.id });

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      taskId: result[0].id,
    });
  } catch (error) {
    console.error('Update task status error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
