import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Files function called:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const fileId = pathParts[pathParts.length - 1];

    // Unified handler: supabase.functions.invoke always uses POST, so we infer action
    const path = url.pathname;
    const pathSegments = path.split('/').filter(Boolean);
    const maybeId = pathSegments[pathSegments.length - 1];
    const isIdPath = maybeId && maybeId !== 'files';

    // Try to read JSON body, default to {}
    let payload: any = {};
    try {
      const bodyText = await req.text();
      console.log('Raw body:', bodyText);
      payload = bodyText ? JSON.parse(bodyText) : {};
    } catch (e) {
      console.warn('Body parse failed, continuing with empty object');
      payload = {};
    }

    // Determine intended action
    // List: POST with empty body to /files OR explicit method GET
    const isList = (!isIdPath && (req.method === 'GET' || (req.method === 'POST' && Object.keys(payload).length === 0)));

    // Create: POST to /files with filename present
    const isCreate = (!isIdPath && req.method === 'POST' && typeof payload.filename === 'string');

    // Update: POST/PUT to /files/:id with content/filename/language
    const isUpdate = (isIdPath && (req.method === 'PUT' || req.method === 'POST') && (
      'filename' in payload || 'content' in payload || 'language' in payload
    ));

    // Delete: DELETE or POST with empty body to /files/:id
    const isDelete = (isIdPath && (req.method === 'DELETE' || (req.method === 'POST' && Object.keys(payload).length === 0)));

    if (isList) {
      const { data: files, error: fetchError } = await supabase
        .from('files')
        .select('*')
        .order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      return new Response(JSON.stringify(files), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (isCreate) {
      console.log('Creating file:', payload);
      const { data: newFile, error: createError } = await supabase
        .from('files')
        .insert([{ filename: payload.filename, content: payload.content || '', language: payload.language || 'javascript' }])
        .select()
        .single();
      if (createError) throw createError;
      return new Response(JSON.stringify(newFile), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (isUpdate) {
      console.log('Updating file:', maybeId, payload);
      const updateData: Record<string, any> = {};
      if ('filename' in payload) updateData.filename = payload.filename;
      if ('content' in payload) updateData.content = payload.content;
      if ('language' in payload) updateData.language = payload.language;
      const { data: updatedFile, error: updateError } = await supabase
        .from('files')
        .update(updateData)
        .eq('id', maybeId)
        .select()
        .single();
      if (updateError) throw updateError;
      return new Response(JSON.stringify(updatedFile), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (isDelete) {
      console.log('Deleting file:', maybeId);
      const { error: deleteError } = await supabase.from('files').delete().eq('id', maybeId);
      if (deleteError) throw deleteError;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fallback for unsupported operations
    return new Response(JSON.stringify({ error: 'Unsupported operation' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const err = error as Error;
    console.error('Error in files function:', err);
    return new Response(JSON.stringify({ error: err?.message || 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});