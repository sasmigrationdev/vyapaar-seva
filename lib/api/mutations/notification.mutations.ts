import { supabase } from '@/lib/supabase/client';

export const notificationMutations = {
  /**
   * Mark notification as read
   */
  markAsRead: async (notificationId: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (userId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
  },

  /**
   * Delete notification
   */
  deleteNotification: async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
  },

  /**
   * Create notification using database function (bypasses RLS)
   */
  createNotification: async (params: {
    userId: string;
    title: string;
    message: string;
    type: string;
    relatedId?: string;
    relatedType?: string;
  }) => {
    // Validate userId
    if (!params.userId || typeof params.userId !== 'string') {
      console.warn('Invalid userId for notification:', params.userId);
      return null;
    }

    const { data, error } = await supabase.rpc('create_notification', {
      p_user_id: params.userId,
      p_title: params.title,
      p_message: params.message,
      p_type: params.type,
      p_related_id: params.relatedId || null,
      p_related_type: params.relatedType || null,
    });

    if (error) throw error;
    return { id: data };
  },
};
