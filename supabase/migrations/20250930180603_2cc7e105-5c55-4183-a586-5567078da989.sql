-- Step 2: Create analytics tables and functions

-- Create analytics_cache table for pre-computed metrics
CREATE TABLE IF NOT EXISTS public.analytics_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value jsonb NOT NULL,
  computed_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  UNIQUE(metric_name)
);

ALTER TABLE public.analytics_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view analytics cache"
  ON public.analytics_cache
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND user_type = 'admin'
    )
  );

-- Create page_views table for tracking user activity
CREATE TABLE IF NOT EXISTS public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  page_path text NOT NULL,
  viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  session_id text,
  user_agent text,
  ip_address inet
);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view page analytics"
  ON public.page_views
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "System can insert page views"
  ON public.page_views
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create admin_permissions table
CREATE TABLE IF NOT EXISTS public.admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_name text NOT NULL,
  granted_at timestamp with time zone NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id, permission_name)
);

ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage permissions"
  ON public.admin_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND user_type = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_page_views_viewed_at ON public.page_views(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_user_id ON public.page_views(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_metric_name ON public.analytics_cache(metric_name);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires_at ON public.analytics_cache(expires_at);

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = user_id_param AND user_type = 'admin'
  );
$$;

-- Function to get dashboard analytics
CREATE OR REPLACE FUNCTION public.get_dashboard_analytics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Check if user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles),
    'total_vendors', (SELECT COUNT(*) FROM profiles WHERE user_type = 'vendor'),
    'total_clients', (SELECT COUNT(*) FROM profiles WHERE user_type = 'client'),
    'total_quotes', (SELECT COUNT(*) FROM quotes),
    'total_projects', (SELECT COUNT(*) FROM projects),
    'active_projects', (SELECT COUNT(*) FROM projects WHERE status != 'completed'),
    'avg_vendor_response_time', (
      SELECT COALESCE(AVG(response_time_hours), 0)
      FROM vendor_profiles
      WHERE response_time_hours IS NOT NULL
    ),
    'total_invoices', (SELECT COUNT(*) FROM invoices),
    'total_revenue', (SELECT COALESCE(SUM(service_fee_amount), 0) FROM invoices WHERE paid_at IS NOT NULL),
    'quotes_by_status', (
      SELECT jsonb_object_agg(status, count)
      FROM (
        SELECT status::text, COUNT(*) as count
        FROM quote_requests
        GROUP BY status
      ) sub
    ),
    'recent_signups', (
      SELECT COUNT(*) FROM profiles
      WHERE created_at > now() - interval '7 days'
    ),
    'recent_quotes', (
      SELECT COUNT(*) FROM quotes
      WHERE created_at > now() - interval '7 days'
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Function to get user growth analytics
CREATE OR REPLACE FUNCTION public.get_user_growth_analytics(days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'date', date,
      'total_signups', total_signups,
      'vendor_signups', vendor_signups,
      'client_signups', client_signups
    )
  )
  INTO result
  FROM (
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as total_signups,
      COUNT(*) FILTER (WHERE user_type = 'vendor') as vendor_signups,
      COUNT(*) FILTER (WHERE user_type = 'client') as client_signups
    FROM profiles
    WHERE created_at > now() - (days || ' days')::interval
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  ) sub;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- Function to get vendor performance metrics
CREATE OR REPLACE FUNCTION public.get_vendor_performance_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'vendor_id', vp.user_id,
      'business_name', vp.business_name,
      'rating', vp.rating,
      'total_reviews', vp.total_reviews,
      'response_time_hours', vp.response_time_hours,
      'total_quotes', quote_count,
      'accepted_quotes', accepted_count,
      'acceptance_rate', CASE WHEN quote_count > 0 THEN (accepted_count::float / quote_count * 100) ELSE 0 END
    )
  )
  INTO result
  FROM vendor_profiles vp
  LEFT JOIN (
    SELECT 
      vendor_id,
      COUNT(*) as quote_count,
      COUNT(*) FILTER (WHERE status = 'accepted') as accepted_count
    FROM quote_requests
    GROUP BY vendor_id
  ) qr ON qr.vendor_id = vp.user_id
  WHERE vp.verification_status = 'verified'
  ORDER BY vp.rating DESC NULLS LAST;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;