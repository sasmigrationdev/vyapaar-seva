import { supabase } from '@/lib/supabase/client';
import { Notification } from '@/lib/types';

export const notificationQueries = {
  /**
   * Get notifications for a user
   */
  getUserNotifications: async (userId: string, limit?: number): Promise<Notification[]> => {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (limit) query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Get unread notifications count
   */
  getUnreadNotificationsCount: async (userId: string): Promise<number> => {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  },

  /**
   * Get unread notifications
   */
  getUnreadNotifications: async (userId: string): Promise<Notification[]> => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get notification by ID
   */
  getNotificationById: async (notificationId: string): Promise<Notification | null> => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },
};
