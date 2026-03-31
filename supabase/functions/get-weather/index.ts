import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeatherData {
  temperature: number;
  feelsLike: number;
  condition: string;
  precipitation: number;
  windSpeed: number;
  windDirection: string;
  visibility: number;
  humidity: number;
  warnings: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address } = await req.json();
    
    if (!address) {
      return new Response(
        JSON.stringify({ error: 'Address is required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const weatherApiKey = Deno.env.get('WEATHER_API_KEY');
    if (!weatherApiKey) {
      return new Response(
        JSON.stringify({ error: 'Weather API key not configured' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching weather for address:', address);

    const weatherResponse = await fetch(
      `http://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=${encodeURIComponent(address)}&aqi=yes`
    );

    if (!weatherResponse.ok) {
      console.error('Weather API error:', weatherResponse.status, await weatherResponse.text());
      return new Response(
        JSON.stringify({ error: 'Failed to fetch weather data' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const weatherJson = await weatherResponse.json();
    console.log('Weather API response:', weatherJson);

    // Generate warnings based on conditions
    const warnings: string[] = [];
    const temp = weatherJson.current.temp_f;
    const condition = weatherJson.current.condition.text.toLowerCase();
    const windSpeed = weatherJson.current.wind_mph;
    const visibility = weatherJson.current.vis_miles;
    const precipitation = weatherJson.current.precip_in;

    if (temp > 90) warnings.push("🌡️ Excessive heat - monitor tire pressure and brake temperatures");
    if (temp < 40) warnings.push("🧊 Cold conditions - allow extra warm-up time");
    if (condition.includes('rain') || precipitation > 0) warnings.push("🌧️ Wet conditions - reduce speed and increase following distance");
    if (windSpeed > 25) warnings.push("💨 High winds - expect crosswind effects");
    if (visibility < 5) warnings.push("🌫️ Poor visibility - use caution");
    if (condition.includes('snow') || condition.includes('ice')) warnings.push("❄️ Hazardous conditions - consider postponing session");

    const weatherData: WeatherData = {
      temperature: Math.round(temp),
      condition: weatherJson.current.condition.text,
      precipitation: precipitation,
      windSpeed: Math.round(windSpeed),
      windDirection: weatherJson.current.wind_dir,
      visibility: visibility,
      humidity: weatherJson.current.humidity,
      warnings
    };

    return new Response(
      JSON.stringify(weatherData), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-weather function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});