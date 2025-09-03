import { supabase } from './supabase.js';

// Supabase database functions

export const connectDB = async () => {
  try {
    // Test Supabase connection
    const { data, error } = await supabase.from('sets').select('count').limit(1);
    
    if (error) {
      console.log('⚠️  Supabase connection test failed:', error.message);
      throw error;
    } else {
      console.log('✅ Supabase database connected successfully');
    }
    
    console.log('📚 Using Supabase as database backend');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

// Create a MySQL-compatible interface for Supabase
export const getDB = () => {
  return {
    execute: async (query, params = []) => {
      try {
        // Convert MySQL queries to Supabase queries
        if (query.includes('SELECT') && query.includes('FROM sets')) {
          // Handle sets queries
          if (query.includes('COUNT(f.id) as flashcard_count')) {
            // Get sets with flashcard count
            let query = supabase
              .from('sets')
              .select(`
                *,
                flashcards(count),
                study_sessions(count)
              `);
            
            // Only add favorites filter if user_id is provided and not null
            if (params[0] && params[0] !== 'null') {
              query = query.eq('favorites.user_id', params[0]);
            }
            
            const { data: sets, error } = await query;
            
            if (error) throw error;
            
            // Transform the data to match expected format
            const transformedSets = sets.map(set => ({
              ...set,
              flashcard_count: set.flashcards?.[0]?.count || 0,
              study_sessions_count: set.study_sessions?.[0]?.count || 0,
              is_favorited: false // Will be handled separately for now
            }));
            
            return [transformedSets];
          } else if (query.includes('WHERE s.id = ?')) {
            // Get single set
            const { data: sets, error } = await supabase
              .from('sets')
              .select(`
                *,
                flashcards(count),
                favorites!inner(user_id)
              `)
              .eq('id', params[1])
              .eq('favorites.user_id', params[0] || null)
              .single();
            
            if (error) throw error;
            
            const transformedSet = {
              ...sets,
              flashcard_count: sets.flashcards?.[0]?.count || 0,
              is_favorited: sets.favorites && sets.favorites.length > 0
            };
            
            return [[transformedSet]];
          } else {
            // General sets query
            const { data: sets, error } = await supabase
              .from('sets')
              .select('*')
              .order('updated_at', { ascending: false });
            
            if (error) throw error;
            return [sets];
          }
        } else if (query.includes('INSERT INTO sets')) {
          // Create new set
          const { data, error } = await supabase
            .from('sets')
            .insert({
              id: params[0],
              user_id: params[1],
              title: params[2],
              description: params[3],
              tags: params[4] ? JSON.parse(params[4]) : null,
              is_public: params[5],
              is_collaborative: params[6]
            })
            .select()
            .single();
          
          if (error) throw error;
          return [[data]];
        } else if (query.includes('UPDATE sets SET')) {
          // Update set
          const updateData = {};
          const updateFields = query.match(/SET (.*?) WHERE/)[1].split(', ');
          const updateValues = params.slice(0, -1);
          
          updateFields.forEach((field, index) => {
            const fieldName = field.split(' = ')[0];
            updateData[fieldName] = updateValues[index];
          });
          
          const { data, error } = await supabase
            .from('sets')
            .update(updateData)
            .eq('id', params[params.length - 1])
            .select()
            .single();
          
          if (error) throw error;
          return [[data]];
        } else if (query.includes('DELETE FROM sets')) {
          // Delete set
          const { error } = await supabase
            .from('sets')
            .delete()
            .eq('id', params[0]);
          
          if (error) throw error;
          return [[]];
        } else if (query.includes('FROM flashcards')) {
          // Handle flashcards queries
          if (query.includes('WHERE set_id = ?')) {
            const { data: flashcards, error } = await supabase
              .from('flashcards')
              .select('*')
              .eq('set_id', params[0])
              .order('created_at', { ascending: true });
            
            if (error) throw error;
            return [flashcards];
          } else if (query.includes('INSERT INTO flashcards')) {
            // Create new flashcard
            const { data, error } = await supabase
              .from('flashcards')
              .insert({
                id: params[0],
                set_id: params[1],
                term: params[2],
                description: params[3]
              })
              .select()
              .single();
            
            if (error) throw error;
            return [[data]];
          }
        } else if (query.includes('FROM favorites')) {
          // Handle favorites queries
          if (query.includes('SELECT id FROM favorites WHERE user_id = ? AND set_id = ?')) {
            const { data: favorites, error } = await supabase
              .from('favorites')
              .select('id')
              .eq('user_id', params[0])
              .eq('set_id', params[1]);
            
            if (error) throw error;
            return [favorites];
          } else if (query.includes('INSERT INTO favorites')) {
            // Add to favorites
            const { data, error } = await supabase
              .from('favorites')
              .insert({
                id: params[0],
                user_id: params[1],
                set_id: params[2]
              })
              .select()
              .single();
            
            if (error) throw error;
            return [[data]];
          } else if (query.includes('DELETE FROM favorites')) {
            // Remove from favorites
            const { error } = await supabase
              .from('favorites')
              .delete()
              .eq('user_id', params[0])
              .eq('set_id', params[1]);
            
            if (error) throw error;
            return [[]];
          }
        }
        
        // Default fallback
        console.log('⚠️  Unhandled query:', query);
      return [[]];
        
      } catch (error) {
        console.error('Database query error:', error);
        throw error;
      }
    },
    getConnection: async () => {
      return {
        release: () => {}
      };
    }
  };
};

export default getDB();
