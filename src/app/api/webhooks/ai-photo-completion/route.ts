import { getDb } from '@/db';
import { aiPhotoTask } from '@/db/schema';
import { uploadFile } from '@/storage';
import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

interface ReplicateWebhookData {
  id: string; // Replicate预测ID
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string[]; // 生成的图片URL数组
  error?: string;
  completed_at?: string;
}

/**
 * 处理Replicate AI图片完成回调
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // 获取请求体
    const webhookData: ReplicateWebhookData = await req.json();

    // 从查询参数中获取我们的任务ID
    const url = new URL(req.url);
    const taskId = url.searchParams.get('taskId');

    if (!taskId) {
      console.error('Webhook missing taskId parameter');
      return NextResponse.json(
        { error: 'Missing taskId parameter' },
        { status: 400 }
      );
    }

    console.log(`Webhook received for task ${taskId}:`, {
      replicateId: webhookData.id,
      status: webhookData.status,
      hasOutput: !!webhookData.output,
      error: webhookData.error,
    });

    // 查找对应的任务记录
    const db = await getDb();
    const taskData = await db
      .select()
      .from(aiPhotoTask)
      .where(eq(aiPhotoTask.id, taskId))
      .limit(1);

    if (taskData.length === 0) {
      console.error(`Task not found: ${taskId}`);
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = taskData[0];

    // 处理成功完成的情况
    if (
      webhookData.status === 'succeeded' &&
      webhookData.output &&
      webhookData.output.length > 0
    ) {
      try {
        // 下载AI生成的图片
        const imageUrl = webhookData.output[0]; // 取第一张图片
        console.log(`Downloading image from: ${imageUrl}`);

        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error(
            `Failed to download image: ${imageResponse.statusText}`
          );
        }

        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

        // 生成文件名
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `ai-generated-${timestamp}.png`;

        // 上传到我们的存储服务
        console.log(`Uploading image to storage: ${filename}`);
        const uploadResult = await uploadFile(
          imageBuffer,
          filename,
          'image/png',
          'ai-photo-editor'
        );

        console.log(`Image uploaded successfully: ${uploadResult.url}`);

        // 更新任务状态为完成
        await db
          .update(aiPhotoTask)
          .set({
            status: 'completed',
            outputImageUrl: uploadResult.url,
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(aiPhotoTask.id, taskId));

        console.log(`Task ${taskId} marked as completed`);
      } catch (error) {
        console.error(
          `Error processing successful webhook for task ${taskId}:`,
          error
        );

        // 更新任务状态为失败
        await db
          .update(aiPhotoTask)
          .set({
            status: 'failed',
            errorMessage: `图片处理失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(aiPhotoTask.id, taskId));
      }
    } else if (
      webhookData.status === 'failed' ||
      webhookData.status === 'canceled'
    ) {
      // 处理失败的情况
      console.log(`Task ${taskId} failed or canceled:`, webhookData.error);

      await db
        .update(aiPhotoTask)
        .set({
          status: 'failed',
          errorMessage: webhookData.error || `AI处理${webhookData.status}`,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(aiPhotoTask.id, taskId));
    } else {
      // 其他状态（starting, processing）暂不处理，等待最终状态
      console.log(`Task ${taskId} status update: ${webhookData.status}`);

      // 只更新状态，不设置完成时间
      await db
        .update(aiPhotoTask)
        .set({
          status:
            webhookData.status === 'starting' ||
            webhookData.status === 'processing'
              ? 'processing'
              : task.status, // 保持原状态
          updatedAt: new Date(),
        })
        .where(eq(aiPhotoTask.id, taskId));
    }

    // 返回成功响应
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook processing error:', error);

    // 返回错误响应
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * 验证Replicate webhook签名
 * 注意：当前暂未实现签名验证，需要根据Replicate文档添加
 */
function verifyReplicateSignature(payload: string, signature: string): boolean {
  // TODO: 实现Replicate webhook签名验证
  // 需要根据Replicate官方文档实现HMAC签名验证
  console.warn('Replicate webhook signature verification not implemented');
  return true; // 暂时跳过验证
}

/**
 * GET方法用于健康检查
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    message: 'AI Photo Completion Webhook Endpoint',
  });
}
