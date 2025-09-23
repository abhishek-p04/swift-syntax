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

    switch (req.method) {
      case 'GET':
        // List all files
        const { data: files, error: fetchError } = await supabase
          .from('files')
          .select('*')
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        return new Response(JSON.stringify(files), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'POST':
        // Create new file
        const createData = await req.json();
        console.log('Creating file:', createData);

        const { data: newFile, error: createError } = await supabase
          .from('files')
          .insert([{
            filename: createData.filename,
            content: createData.content || '',
            language: createData.language || 'javascript'
          }])
          .select()
          .single();

        if (createError) throw createError;

        return new Response(JSON.stringify(newFile), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'PUT':
        // Update file
        const updateData = await req.json();
        console.log('Updating file:', fileId, updateData);

        const { data: updatedFile, error: updateError } = await supabase
          .from('files')
          .update({
            filename: updateData.filename,
            content: updateData.content,
            language: updateData.language
          })
          .eq('id', fileId)
          .select()
          .single();

        if (updateError) throw updateError;

        return new Response(JSON.stringify(updatedFile), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'DELETE':
        // Delete file
        console.log('Deleting file:', fileId);

        const { error: deleteError } = await supabase
          .from('files')
          .delete()
          .eq('id', fileId);

        if (deleteError) throw deleteError;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      default:
        return new Response('Method not allowed', {
          status: 405,
          headers: corsHeaders
        });
    }

  } catch (error) {
    console.error('Error in files function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});