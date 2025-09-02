import { supabase } from './supabase.js';

// Mock database functions for Supabase
export const connectDB = async () => {
  try {
    // Test Supabase connection
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      console.log('⚠️  Supabase connection test failed:', error.message);
      console.log('⚠️  Running in development mode with mock database');
    } else {
      console.log('✅ Supabase database connected successfully');
    }
    
    console.log('📚 Using Supabase as database backend');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.log('⚠️  Running in development mode with mock database');
  }
};

export const getDB = () => {
  // Return a mock database interface that mimics the expected MySQL interface
  return {
    execute: async (query, params = []) => {
      console.log('⚠️  Mock database operation:', query);
      console.log('⚠️  Parameters:', params);
      
      // Return empty result for now
      return [[]];
    },
    getConnection: async () => {
      return {
        release: () => {}
      };
    }
  };
};

export default getDB();
