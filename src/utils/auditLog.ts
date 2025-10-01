import { supabase } from '@/integrations/supabase/client';

export const logAdminAction = async (
  action: string,
  tableName: string,
  recordId?: string,
  oldValues?: any,
  newValues?: any
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.rpc('log_admin_action', {
      p_action: action,
      p_table_name: tableName,
      p_record_id: recordId || null,
      p_old_values: oldValues || null,
      p_new_values: newValues || null
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
};
