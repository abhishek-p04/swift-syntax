import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DebugRequest {
  code: string;
  language: string;
  fileName: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const { code, language, fileName }: DebugRequest = await req.json();
    console.log('AI Debugger request:', { language, fileName, codeLength: code.length });

    const systemPrompt = `You are an expert code analyzer and debugger, similar to GitHub Copilot. Perform comprehensive code analysis.

CRITICAL INSTRUCTIONS:
1. Scan the entire code for potential bugs, errors, and exceptions
2. Analyze code quality and efficiency (time/space complexity)
3. Identify security vulnerabilities and bad practices
4. Suggest improvements and optimizations
5. Provide the COMPLETE fixed/improved code

RESPONSE FORMAT (JSON only):
{
  "issues": [
    {
      "severity": "high|medium|low",
      "type": "bug|error|warning|optimization|security",
      "line": number,
      "description": "Brief description of the issue",
      "impact": "What could go wrong"
    }
  ],
  "improvements": [
    {
      "category": "performance|readability|best-practice|security",
      "description": "What to improve and why"
    }
  ],
  "fixedCode": "The complete improved code with all fixes applied",
  "summary": "Overall assessment and key changes made",
  "complexity": {
    "time": "Current time complexity analysis",
    "space": "Current space complexity analysis",
    "improved": "How the fixes improve complexity"
  }
}

Always provide production-ready, optimized code with proper error handling.`;

    const userPrompt = `File: ${fileName}
Language: ${language}

Code to analyze:
\`\`\`${language}
${code}
\`\`\`

Please perform a comprehensive analysis and provide fixes and improvements.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limits exceeded, please try again later.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Payment required, please add funds to your Lovable AI workspace.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    console.log('AI response received');

    // Parse the JSON response
    let debugResult;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      debugResult = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Validate the structure
    if (!debugResult.fixedCode || !debugResult.issues) {
      throw new Error('Invalid debug result: missing required fields');
    }

    return new Response(JSON.stringify({ result: debugResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const err = error as Error;
    console.error('Error in ai-debugger function:', err);
    return new Response(JSON.stringify({ 
      error: err?.message || 'An unexpected error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
