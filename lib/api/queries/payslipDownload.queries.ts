import { supabase } from '@/lib/supabase/client';
import { PayslipDownload } from '@/lib/types';

export const payslipDownloadQueries = {
  /**
   * Get all payslip download records for a user
   */
  getUserDownloads: async (userId: string): Promise<PayslipDownload[]> => {
    const { data, error } = await supabase
      .from('payslip_downloads')
      .select('*')
      .eq('user_id', userId)
      .order('downloaded_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Check if a specific payslip has been downloaded
   */
  isPayslipDownloaded: async (
    userId: string,
    month: number,
    year: number
  ): Promise<boolean> => {
    const { data, error } = await supabase
      .from('payslip_downloads')
      .select('id')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('year', year)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  },
};
