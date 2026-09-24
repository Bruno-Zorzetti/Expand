import { createClient } from '@/lib/supabase/server';

// SSE stream — envia progresso da campanha a cada 3s
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Não autorizado', { status: 401 });

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const poll = async () => {
        while (!closed) {
          const [camp, total, sent, failed, replied] = await Promise.all([
            supabase.from('crm_campaigns').select('status, started_at, done_at').eq('id', id).single(),
            supabase.from('crm_recipients').select('id', { count: 'exact', head: true }).eq('campaign_id', id),
            supabase.from('crm_recipients').select('id', { count: 'exact', head: true }).eq('campaign_id', id).eq('status', 'sent'),
            supabase.from('crm_recipients').select('id', { count: 'exact', head: true }).eq('campaign_id', id).eq('status', 'failed'),
            supabase.from('crm_recipients').select('id', { count: 'exact', head: true }).eq('campaign_id', id).in('status', ['replied', 'read']),
          ]);

          send({
            status: camp.data?.status,
            total: total.count ?? 0,
            sent: sent.count ?? 0,
            failed: failed.count ?? 0,
            replied: replied.count ?? 0,
            started_at: camp.data?.started_at,
            done_at: camp.data?.done_at,
          });

          if (camp.data?.status === 'done') {
            closed = true;
            controller.close();
            return;
          }

          await new Promise((r) => setTimeout(r, 3000));
        }
      };

      poll().catch(() => { closed = true; controller.close(); });
    },
    cancel() { closed = true; },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
