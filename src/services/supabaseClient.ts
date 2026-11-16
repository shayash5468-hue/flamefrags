import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PsiFileRecord } from '../types';

// Read credentials from VITE environment variables for client-side hosting on Vercel
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

let client: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } catch (err) {
    console.warn('[Supabase] Failed to initialize client:', err);
  }
}

export const supabase = client;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(client && supabaseUrl && supabaseAnonKey);
};

export const getSupabaseConfigStatus = () => {
  return {
    isConfigured: isSupabaseConfigured(),
    url: supabaseUrl ? supabaseUrl.replace(/https?:\/\/([^.]+).*/, '$1.supabase.co') : 'Not Set',
  };
};

/**
 * Fetch combustion datasets stored in Supabase
 * Falls back gracefully if table does not exist yet or client is not configured
 */
export async function fetchSupabaseDatasets(): Promise<PsiFileRecord[]> {
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('psi_datasets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase] Error querying psi_datasets table:', error.message);
      return [];
    }

    if (!data || !Array.isArray(data)) return [];

    return data.map((item: any, idx: number): PsiFileRecord => ({
      id: item.id || `sb-${idx}`,
      filename: item.filename || `Dataset-${item.id || idx}.csv`,
      fileSizeBytes: item.file_size_bytes || 45200,
      format: (item.format === 'xlsx' || item.format === 'txt' ? item.format : 'csv'),
      uploadedAt: item.created_at ? new Date(item.created_at).toISOString().split('T')[0] : 'Remote Cloud',
      mission: item.mission || 'Supabase Remote',
      investigationName: item.investigation_name || item.title || 'Supabase Combustion Dataset',
      piName: item.pi_name || 'Supabase Collaborator',
      fuelType: item.fuel_type || 'Hydrocarbon / Solid',
      gravityCondition: item.gravity_condition || '0G / 1G Comparative',
      oxygenRange: item.oxygen_range || '18% - 30%',
      flowRange: item.flow_range || '0.0 - 0.2 m/s',
      columns: item.columns || ['Time_s', 'Flame_Diameter_mm', 'Temperature_C', 'Soot_Vol_Fraction'],
      sampleRows: item.sample_rows || [],
      qualityReport: item.quality_report || {
        totalRows: item.total_rows || 120,
        missingValues: 0,
        duplicateRows: 0,
        inconsistentUnits: 0,
        status: 'validated',
      },
      description: item.description || 'Dataset retrieved from Supabase database.',
    }));
  } catch (err) {
    console.warn('[Supabase] fetchSupabaseDatasets error:', err);
    return [];
  }
}

/**
 * Upload a dataset record to Supabase
 */
export async function saveDatasetToSupabase(record: PsiFileRecord): Promise<{ success: boolean; error?: string }> {
  if (!client) {
    return {
      success: false,
      error: 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your Vercel or local .env',
    };
  }

  try {
    const { error } = await client.from('psi_datasets').insert({
      filename: record.filename,
      mission: record.mission,
      investigation_name: record.investigationName,
      pi_name: record.piName,
      fuel_type: record.fuelType,
      gravity_condition: record.gravityCondition,
      oxygen_range: record.oxygenRange,
      flow_range: record.flowRange,
      columns: record.columns,
      sample_rows: record.sampleRows?.slice(0, 10),
      quality_report: record.qualityReport,
      description: record.description,
      total_rows: record.qualityReport?.totalRows || 0,
      format: record.format,
      file_size_bytes: record.fileSizeBytes,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save to Supabase' };
  }
}
