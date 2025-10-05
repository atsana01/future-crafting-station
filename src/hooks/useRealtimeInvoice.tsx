import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export const useRealtimeInvoice = (invoiceId: string | null) => {
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!invoiceId) {
      setLoading(false);
      return;
    }

    let channel: RealtimeChannel;

    const fetchInvoice = async () => {
      try {
        const { data, error } = await supabase
          .from('invoices')
          .select(`
            *,
            quotes!inner(
              total_amount,
              cost_breakdown,
              milestones,
              inclusions,
              exclusions,
              validity_date,
              insurance_will_be_used,
              estimated_timeline
            )
          `)
          .eq('id', invoiceId)
          .single();

        if (error) throw error;
        setInvoice(data);
      } catch (error) {
        console.error('Error fetching invoice:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();

    // Subscribe to realtime updates for this invoice
    channel = supabase
      .channel(`invoice-${invoiceId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'invoices',
          filter: `id=eq.${invoiceId}`,
        },
        (payload) => {
          console.log('Invoice updated:', payload);
          setInvoice((prev: any) => ({
            ...prev,
            ...payload.new,
          }));
        }
      )
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [invoiceId]);

  return { invoice, loading, refetch: () => setLoading(true) };
};
