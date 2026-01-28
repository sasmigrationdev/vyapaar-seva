import { supabase } from '@/lib/supabase/client';
import { PayslipDownload } from '@/lib/types';
import { Platform } from 'react-native';
import * as Device from 'expo-device';

export const payslipDownloadMutations = {
  /**
   * Record a successful payslip download
   */
  recordDownload: async (
    userId: string,
    month: number,
    year: number
  ): Promise<PayslipDownload> => {
    const deviceInfo = Device.modelName
      ? `${Device.brand || ''} ${Device.modelName}`.trim()
      : undefined;

    const { data, error } = await supabase
      .from('payslip_downloads')
      .insert({
        user_id: userId,
        month,
        year,
        device_platform: Platform.OS,
        device_info: deviceInfo,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
