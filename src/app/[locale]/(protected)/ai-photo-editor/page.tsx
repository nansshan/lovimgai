import { PhotoEditorClient } from '@/components/ai-elements/photo-editor-client';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { getTranslations } from 'next-intl/server';

/**
 * AI Photo Editor page
 *
 * This page provides AI-powered image generation and editing capabilities
 * with a three-column layout: sidebar + chat interface + image preview
 */
export default async function AIPhotoEditorPage() {
  const t = await getTranslations('Dashboard.aiPhotoEditor');

  const breadcrumbs = [
    {
      label: t('title'),
      isCurrentPage: true,
    },
  ];

  return (
    <>
      <DashboardHeader breadcrumbs={breadcrumbs} />

      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1">
          <PhotoEditorClient />
        </div>
      </div>
    </>
  );
}
