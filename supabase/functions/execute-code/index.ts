import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LANGUAGE_MAP: { [key: string]: number } = {
  'python': 71,
  'javascript': 63,
  'typescript': 74,
  'cpp': 54,
  'c': 50,
  'java': 62,
  'csharp': 51,
  'php': 68,
  'ruby': 72,
  'go': 60,
  'rust': 73,
  'plaintext': 63 // Default to JavaScript
};

serve(async (req) => {
  console.log('Execute code function called');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, language } = await req.json();
    console.log('Executing code:', { language, codeLength: code?.length });

    const languageId = LANGUAGE_MAP[language] || LANGUAGE_MAP.javascript;
    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');

    if (!rapidApiKey) {
      throw new Error('RAPIDAPI_KEY not configured');
    }

    // Submit code to Judge0
    const submissionResponse = await fetch('https://judge0-ce.p.rapidapi.com/submissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
      },
      body: JSON.stringify({
        source_code: code,
        language_id: languageId,
        stdin: '',
        expected_output: ''
      })
    });

    if (!submissionResponse.ok) {
      throw new Error(`Submission failed: ${submissionResponse.status}`);
    }

    const submissionData = await submissionResponse.json();
    const token = submissionData.token;
    console.log('Submission token:', token);

    // Poll for results with timeout
    const startTime = Date.now();
    const timeout = 10000; // 10 seconds timeout

    while (Date.now() - startTime < timeout) {
      const resultResponse = await fetch(`https://judge0-ce.p.rapidapi.com/submissions/${token}`, {
        headers: {
          'X-RapidAPI-Key': rapidApiKey,
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
        }
      });

      if (!resultResponse.ok) {
        throw new Error(`Result fetch failed: ${resultResponse.status}`);
      }

      const result = await resultResponse.json();
      console.log('Execution result:', result);

      if (result.status.id >= 3) { // Execution completed
        return new Response(JSON.stringify({
          stdout: result.stdout || '',
          stderr: result.stderr || '',
          compile_output: result.compile_output || '',
          time: result.time || '0',
          memory: result.memory || 0,
          status: {
            description: result.status.description
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Execution timeout');

  } catch (error) {
    const err = error as Error;
    console.error('Error in execute-code function:', err);
    return new Response(JSON.stringify({ 
      error: err?.message || 'Execution failed',
      stderr: `Execution failed: ${err?.message || 'Unknown error'}`,
      status: { description: 'Runtime Error' }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});