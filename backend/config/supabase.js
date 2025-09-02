import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://db.munrveyxpveqhijpcjjw.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11bnJ2ZXl4cHZlcWhpanBjamp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3MjMzNjMsImV4cCI6MjA3MjI5OTM2M30.d2xTOKZZ1WF7jVtV_iIr_84t__xhFTt1Zwf4fqzrF-E';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const uploadFile = async (file, path) => {
  try {
    const { data, error } = await supabase.storage
      .from('uploads')
      .upload(path, file);
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

export const deleteFile = async (path) => {
  try {
    const { error } = await supabase.storage
      .from('uploads')
      .remove([path]);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
};

export default supabase;
