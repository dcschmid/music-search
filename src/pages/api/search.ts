import type { APIRoute } from 'astro';
import { searchAllPlatforms } from '../../lib/musicSearch';

/**
 * API Route: /api/search
 *
 * Sucht nach Alben auf Spotify, Apple Music und Deezer.
 *
 * @param {Request} request - Astro Request Objekt
 * @returns {Response} - Astro Response Objekt
 */
export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const artistName = formData.get('artistName')?.toString().trim() || '';
  const albumName = formData.get('albumName')?.toString().trim() || '';

  if (!artistName) {
    return new Response(JSON.stringify({
      error: 'Künstlername muss angegeben werden.',
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  try {
    const albums = await searchAllPlatforms(artistName, albumName);

    // Erfolgreiche Antwort
    return new Response(JSON.stringify(albums), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    // Fehler abfangen und protokollieren
    console.error("Fehler bei der Albumsuche:", error);
    return new Response(JSON.stringify({
      error: 'Fehler bei der Albumsuche.',
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
