import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      throw new Error('GOOGLE_PLACES_API_KEY is not configured');
    }

    const { input, type } = await req.json();
    if (!input || typeof input !== 'string' || input.length < 2) {
      return new Response(JSON.stringify({ predictions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (type === 'details') {
      // Place details request
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(input)}&fields=formatted_address,geometry,address_components,name&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.status !== 'OK') {
        throw new Error(`Places API error: ${data.status}`);
      }

      const result = data.result;
      const components = result.address_components || [];
      const getComponent = (type: string) =>
        components.find((c: any) => c.types.includes(type))?.long_name || '';
      const getShort = (type: string) =>
        components.find((c: any) => c.types.includes(type))?.short_name || '';

      return new Response(JSON.stringify({
        success: true,
        name: result.name,
        formatted_address: result.formatted_address,
        city: getComponent('locality') || getComponent('sublocality'),
        state: getShort('administrative_area_level_1'),
        zip_code: getComponent('postal_code'),
        latitude: result.geometry?.location?.lat,
        longitude: result.geometry?.location?.lng,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Autocomplete request
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=establishment|geocode&components=country:us&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Places API error: ${data.status}`);
    }

    const predictions = (data.predictions || []).map((p: any) => ({
      place_id: p.place_id,
      description: p.description,
      main_text: p.structured_formatting?.main_text,
      secondary_text: p.structured_formatting?.secondary_text,
    }));

    return new Response(JSON.stringify({ predictions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Places autocomplete error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
