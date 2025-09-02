import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, delimiter = ':', count = 10 } = await req.json();

    if (!text?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Text content is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const hfApiKey = Deno.env.get('HUGGING_FACE_API_KEY');
    if (!hfApiKey) {
      console.error('Hugging Face API key not found');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // First try to parse flashcards from delimiter
    let flashcards: any[] = [];
    
    if (text.includes(delimiter)) {
      const lines = text.split('\n').filter(line => line.trim());
      flashcards = lines
        .filter(line => line.includes(delimiter))
        .map((line, index) => {
          const parts = line.split(delimiter);
          if (parts.length >= 2) {
            return {
              term: parts[0].trim(),
              description: parts.slice(1).join(delimiter).trim()
            };
          }
          return null;
        })
        .filter(card => card && card.term && card.description)
        .slice(0, count);
    }

    // If we don't have enough flashcards from parsing, use AI to generate more
    if (flashcards.length < Math.min(count, 5)) {
      try {
        const prompt = `Create ${count} flashcards from this text. Return them in this format: "Term${delimiter} Description"
        
Text: ${text.substring(0, 2000)}

Please create clear, concise flashcards with important terms and their definitions. Each flashcard should be on a new line.`;

        console.log('Making request to Hugging Face API...');
        
        const response = await fetch(
          'https://api-inference.huggingface.co/models/google/flan-t5-base',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${hfApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              inputs: prompt,
              parameters: {
                max_new_tokens: 1000,
                temperature: 0.7,
                top_p: 0.9,
              }
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Hugging Face API error:', response.status, errorText);
          throw new Error(`Hugging Face API error: ${response.status}`);
        }

        const aiResult = await response.json();
        console.log('Hugging Face response:', aiResult);

        if (aiResult && aiResult[0]?.generated_text) {
          const generatedText = aiResult[0].generated_text;
          const aiLines = generatedText.split('\n').filter(line => line.trim());
          
          const aiFlashcards = aiLines
            .filter(line => line.includes(delimiter))
            .map(line => {
              const parts = line.split(delimiter);
              if (parts.length >= 2) {
                return {
                  term: parts[0].trim(),
                  description: parts.slice(1).join(delimiter).trim()
                };
              }
              return null;
            })
            .filter(card => card && card.term && card.description);

          // Combine parsed and AI-generated flashcards
          flashcards = [...flashcards, ...aiFlashcards].slice(0, count);
        }
      } catch (aiError) {
        console.error('AI generation error:', aiError);
        // If AI fails but we have some parsed flashcards, continue with those
        if (flashcards.length === 0) {
          return new Response(
            JSON.stringify({ error: 'Failed to generate flashcards. Try using a different format or check your text.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }
      }
    }

    if (flashcards.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: `No flashcards could be generated. Try using the format: "term${delimiter} description" or provide more structured text.`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Generated ${flashcards.length} flashcards`);

    return new Response(
      JSON.stringify({ flashcards, count: flashcards.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-flashcards function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});