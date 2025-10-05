import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export const useRealtimeQuote = (quoteRequestId: string | null) => {
  const [quote, setQuote] = useState<any>(null);
  const [quoteRequest, setQuoteRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!quoteRequestId) {
      setLoading(false);
      return;
    }

    let quoteChannel: RealtimeChannel;
    let requestChannel: RealtimeChannel;

    const fetchData = async () => {
      try {
        // Fetch quote request
        const { data: qr, error: qrError } = await supabase
          .from('quote_requests')
          .select('*')
          .eq('id', quoteRequestId)
          .single();

        if (qrError) throw qrError;
        setQuoteRequest(qr);

        // Fetch latest quote
        const { data: q, error: qError } = await supabase
          .from('quotes')
          .select('*')
          .eq('quote_request_id', quoteRequestId)
          .eq('is_current_version', true)
          .single();

        if (qError && qError.code !== 'PGRST116') throw qError;
        setQuote(q);
      } catch (error) {
        console.error('Error fetching quote data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Subscribe to quote request updates
    requestChannel = supabase
      .channel(`quote-request-${quoteRequestId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'quote_requests',
          filter: `id=eq.${quoteRequestId}`,
        },
        (payload) => {
          console.log('Quote request updated:', payload);
          setQuoteRequest(payload.new);
        }
      )
      .subscribe();

    // Subscribe to quote updates
    quoteChannel = supabase
      .channel(`quotes-${quoteRequestId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quotes',
          filter: `quote_request_id=eq.${quoteRequestId}`,
        },
        (payload) => {
          console.log('Quote updated:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newQuote = payload.new as any;
            if (newQuote.is_current_version) {
              setQuote(newQuote);
            }
          }
        }
      )
      .subscribe();

    return () => {
      if (quoteChannel) supabase.removeChannel(quoteChannel);
      if (requestChannel) supabase.removeChannel(requestChannel);
    };
  }, [quoteRequestId]);

  return { quote, quoteRequest, loading, refetch: () => setLoading(true) };
};
