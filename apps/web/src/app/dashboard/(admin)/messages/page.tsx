import type { ContactMessage, Paginated } from '@portfolio/contracts';
import type { Metadata } from 'next';
import { MessageInbox } from '@/components/dashboard/message-inbox';
import { PageHeader } from '@/components/dashboard/ui';
import { adminGetOrEmpty } from '@/lib/admin.server';

export const metadata: Metadata = { title: 'Messages' };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ filter?: string; page?: string }> }) {
  const params = await searchParams;
  const filter = params.filter === 'unread' ? 'unread' : 'all';
  const pageNumber = Math.max(1, Number(params.page) || 1);
  const page = await adminGetOrEmpty<Paginated<ContactMessage>>(`/admin/messages?filter=${filter}&page=${pageNumber}&pageSize=20`, {
    items: [], page: 1, pageSize: 20, total: 0, totalPages: 1,
  });
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Messages" description={`${page.total} message${page.total === 1 ? '' : 's'}. Every message is stored here even if the email notification fails.`} />
      <MessageInbox key={`${filter}-${pageNumber}`} page={page} filter={filter} />
    </div>
  );
}
