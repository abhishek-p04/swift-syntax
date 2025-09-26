import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FileStructure {
  path: string;
  content: string;
  name: string;
}

interface ProjectRequest {
  prompt: string;
  existingFiles: FileStructure[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const aimlApiKey = Deno.env.get('COPILOT_API_KEY');
    if (!aimlApiKey) {
      throw new Error('AIMLAPI key not configured');
    }

    const { prompt, existingFiles }: ProjectRequest = await req.json();
    console.log('AI Copilot request with AIMLAPI:', { prompt, existingFilesCount: existingFiles.length });

    // Create context about existing files
    const existingFilesContext = existingFiles.length > 0
      ? `\n\nExisting files in the project:\n${existingFiles.map(f => `- ${f.path}: ${f.content.split('\n').length} lines`).join('\n')}`
      : '\n\nThis is a new project with no existing files.';

    const systemPrompt = `You are an AI coding assistant that generates complete project structures and code based on user requests.

CRITICAL INSTRUCTIONS:
1. Generate COMPLETE, RUNNABLE code - not placeholders or TODOs
2. Include helpful comments explaining the code for beginners
3. Create proper folder structures when needed
4. Generate all necessary configuration files (package.json, requirements.txt, etc.)
5. Use current best practices and popular libraries
6. Make the code production-ready but simple to understand

RESPONSE FORMAT (JSON only):
{
  "files": [
    {
      "path": "relative/path/to/file.ext",
      "content": "complete file content with comments",
      "language": "javascript|python|html|css|etc"
    }
  ],
  "folders": ["folder1", "folder2/subfolder"],
  "hasConflicts": false,
  "explanation": "Brief explanation of what was generated"
}

If modifying existing files, set hasConflicts: true so user can preview changes.

Examples of good responses:
- Flask app: generate app.py, requirements.txt, templates/, static/
- React app: generate src/components/, package.json, public/index.html
- Node.js API: generate server.js, package.json, routes/, middleware/

Always include proper error handling, logging, and beginner-friendly comments.${existingFilesContext}`;

    let aiResponse: string | null = null;
    try {
      const response = await fetch('https://api.aimlapi.com/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${aimlApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('AIMLAPI error:', errorData);
        throw new Error(`AIMLAPI error: ${response.status}`);
      }

      const data = await response.json();
      aiResponse = data.choices?.[0]?.message?.content;
    } catch (primaryErr) {
      const openaiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openaiKey) throw primaryErr;
      console.log('Falling back to OpenAI');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('OpenAI error:', errorData);
        throw new Error(`OpenAI error: ${response.status}`);
      }

      const data = await response.json();
      aiResponse = data.choices?.[0]?.message?.content;
    }

    if (!aiResponse) {
      throw new Error('Empty AI response');
    }

    console.log('AI response received');

    // Parse the JSON response
    let projectStructure;
    try {
      // Extract JSON from response (handle cases where AI adds extra text)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      projectStructure = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Validate the structure
    if (!projectStructure.files || !Array.isArray(projectStructure.files)) {
      throw new Error('Invalid project structure: missing files array');
    }

    // Check for conflicts with existing files
    const existingPaths = new Set(existingFiles.map(f => f.path));
    const hasConflicts = projectStructure.files.some((file: any) => 
      existingPaths.has(file.path)
    );

    projectStructure.hasConflicts = hasConflicts;

    // Ensure folders array exists
    if (!projectStructure.folders) {
      projectStructure.folders = [];
    }

    console.log('Project structure generated:', {
      filesCount: projectStructure.files.length,
      foldersCount: projectStructure.folders.length,
      hasConflicts
    });

    return new Response(JSON.stringify({ structure: projectStructure }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const err = error as Error;
    console.error('Error in ai-copilot function:', err);
    return new Response(JSON.stringify({ 
      error: err?.message || 'An unexpected error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});