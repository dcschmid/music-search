import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import fs from "fs";

interface SpotifySearchResponse {
  albums: {
    items: {
      id: string;
    }[];
  };
}

/**
 * Represents the results of a search for albums across multiple music platforms.
 */
interface SearchResults {
  /**
   * An array of Spotify album objects.
   */
  spotify: any[];

  /**
   * An array of Apple Music album objects.
   */
  appleMusic: any[];

  /**
   * An array of Deezer album objects.
   */
  deezer: any[];
}

/**
 * Holt den Spotify Access Token.
 *
 * @param clientId Die Client ID von Spotify.
 * @param clientSecret Das Client Secret von Spotify.
 * @returns Der Spotify Access Token.
 * @throws Wenn der Spotify Access Token nicht generiert werden konnte.
 *
 * Die Spotify API erfordert, dass man den Client ID und Client Secret in einem
 * Base64-codierten String an die API sendet. Der Client ID und Client Secret
 * werden in einem String kombiniert und dann Base64-codiert.
 *
 * Anschlie endlich wird der Request gesendet und die API-Antwort wird in einem
 * JSON-Objekt empfangen. Wenn der Spotify Access Token nicht generiert werden
 * konnte, wird ein Fehler geworfen.
 */
async function getSpotifyAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const authString = `${clientId}:${clientSecret}`;
  const base64AuthString = Buffer.from(authString).toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${base64AuthString}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = (await response.json()) as { access_token: string };
  if (data.access_token) {
    return data.access_token;
  } else {
    throw new Error(
      "Spotify Access Token konnte nicht generiert werden. " +
        "Stelle sicher, dass du die Client ID und Client Secret korrekt " +
        "eingestellt hast."
    );
  }
}

/**
 * Holt den Apple Music Token.
 *
 * Der Apple Music Token wird benötigt, um Anfragen an die Apple Music API zu
 * senden. Der Token wird generiert, indem der private Schlüssel mit dem HMAC-SHA256
 * Algorithmus signiert wird.
 *
 * @returns Der Apple Music Token.
 * @throws Wenn der Apple Music Token nicht generiert werden konnte.
 */
function getAppleMusicToken(): string {
  try {
    const privateKey = fs.readFileSync(import.meta.env.APPLE_MUSIC_PRIVATE_KEY_PATH);
    const token = jwt.sign({}, privateKey, {
      /**
       * Algorithmus, der verwendet werden soll, um den Token zu signieren.
       *
       * Der Algorithmus ES256 wird verwendet, da er von Apple Music unterstützt wird.
       */
      algorithm: "ES256",

      /**
       * Gültigkeitsdauer des Tokens in Sekunden.
       *
       * Der Token ist 180 Tage gültig.
       */
      expiresIn: "180d",

      /**
       * Die ID des Entwickler-Teams, der den Token generiert hat.
       *
       * Diese ID wird von Apple Music verwendet, um den Token zu authentifizieren.
       */
      issuer: import.meta.env.APPLE_MUSIC_TEAM_ID,

      /**
       * Kopfzeile des Tokens.
       *
       * Die Kopfzeile enthält den Algorithmus und die ID des Schlüssels, der verwendet
       * wurde, um den Token zu signieren.
       */
      header: {
        alg: "ES256",
        kid: import.meta.env.APPLE_MUSIC_KEY_ID,
      },
    });
    return token;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error("Fehler beim Generieren des Apple Music Tokens: " + error.message);
    } else {
      throw new Error("Unbekannter Fehler");
    }
  }
}

/**
 * Retrieves the details of a Spotify album.
 *
 * @param albumId - The ID of the album to retrieve details for.
 * @param accessToken - The Spotify access token used to authenticate the API request.
 *
 * @returns An object containing the following properties:
 *   - name: The name of the album.
 *   - artist: The name of the first artist.
 *   - artistUrl: The Spotify URL of the artist.
 *   - year: The release year of the album.
 *   - coverUrl: The URL of the album cover image.
 *   - albumUrl: The Spotify URL of the album.
 *   - previewUrl: A preview URL of a track in the album, if available.
 *   - tracklist: An array of track objects, each containing:
 *     - trackNumber: The track number.
 *     - name: The name of the track.
 *     - duration: The duration of the track in milliseconds.
 *     - previewUrl: A preview URL of the track, if available.
 * @throws Throws an error if the Spotify API request fails.
 */
export async function getSpotifyAlbumDetails(albumId: string, accessToken: string): Promise<any> {
  // Make a request to the Spotify API to get album details
  const response = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`, // Use the provided access token
    },
  });

  // Check if the response is not okay and throw an error if needed
  if (!response.ok) {
    throw new Error(`Spotify API returned an error: ${response.statusText}`);
  }

  // Parse the response as JSON
  const album: any = await response.json();

  // Extract tracklist from album data
  const tracklist = album.tracks.items.map((track: any) => ({
    trackNumber: track.track_number, // Track number
    name: track.name, // Track name
    duration: track.duration_ms, // Track duration in milliseconds
  }));

  // Find the first preview URL from the tracks, if available
  let previewUrl = null;
  for (const track of album.tracks.items) {
    if (track.preview_url) {
      previewUrl = track.preview_url;
      break; // Stop searching once a preview URL is found
    }
  }

  // Return an object with album details
  return {
    name: album.name, // Album name
    artist: album.artists[0].name, // Artist name
    artistUrl: album.artists[0].external_urls.spotify, // Spotify URL for the artist
    year: album.release_date.split("-")[0], // Release year
    coverUrl: album.images[0]?.url, // URL for the album cover image
    albumUrl: album.external_urls.spotify, // Spotify URL for the album
    previewUrl: previewUrl || null, // First found Preview URL of a track
    tracklist, // Tracklist for the album
  };
}

/**
 * Searches for albums on Spotify based on the provided artist and album name.
 *
 * @param artistName - The name of the artist to search for.
 * @param albumName - The name of the album to search for. If not provided, only the artist name is used.
 * @param accessToken - The Spotify access token used to authenticate the API request.
 *
 * @returns A promise that resolves to an array of detailed album information objects, each containing:
 *   - name: The name of the album.
 *   - artist: The name of the first artist.
 *   - artistUrl: The Spotify URL of the artist.
 *   - year: The release year of the album.
 *   - coverUrl: The URL of the album cover image.
 *   - albumUrl: The Spotify URL of the album.
 *   - previewUrl: A preview URL of a track in the album, if available.
 *
 * The function fetches a list of albums from Spotify based on the search query
 * and retrieves detailed information for each album using their IDs.
 * It returns an array of these detailed album objects.
 */
export async function searchSpotifyAlbums(artistName: string, albumName: string, accessToken: string): Promise<any[]> {
  // Encode the search query using the artist and album names
  const query = albumName
    ? `${encodeURIComponent(artistName)} ${encodeURIComponent(albumName)}`
    : encodeURIComponent(artistName);

  // Send a request to the Spotify API to search for albums
  const response = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=album&limit=5`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  // Parse the response JSON into a SpotifySearchResponse object
  const data = (await response.json()) as SpotifySearchResponse;

  // Map album IDs to fetch detailed information for each album
  const albumDetailsPromises = data.albums.items.map(async (album: any) => {
    // Fetch detailed information for each album using its ID
    return await getSpotifyAlbumDetails(album.id, accessToken);
  });

  // Wait for all detailed information to be retrieved
  const detailedAlbums = await Promise.all(albumDetailsPromises);

  return detailedAlbums; // Return the detailed information for each album
}

/**
 * Retrieves the details of an Apple Music album.
 *
 * @param albumId - The ID of the album to retrieve details for.
 * @param developerToken - The Apple Music developer token used to authenticate the API request.
 *
 * @returns An object containing the following properties:
 *   - name: The name of the album.
 *   - artist: The name of the artist.
 *   - artistUrl: The Apple Music URL of the artist.
 *   - year: The release year of the album.
 *   - coverUrl: The URL of the album cover image.
 *   - albumUrl: The Apple Music URL of the album.
 *   - previewUrl: A preview URL of a track in the album, if available.
 *   - tracklist: An array of track objects, each containing:
 *     - trackNumber: The track number.
 *     - name: The name of the track.
 *     - duration: The duration of the track in milliseconds.
 *     - previewUrl: A preview URL of the track, if available.
 *
 * The function fetches a list of albums from Apple Music based on the search query
 * and retrieves detailed information for each album using their IDs.
 * It returns an array of these detailed album objects.
 */
export async function getAppleMusicAlbumDetails(albumId: string, developerToken: string): Promise<any> {
  // API call for detailed album information
  const response = await fetch(`https://api.music.apple.com/v1/catalog/de/albums/${albumId}`, {
    headers: {
      Authorization: `Bearer ${developerToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Apple Music API request failed: ${response.statusText}`);
  }

  const albumResponse: any = await response.json();
  const album = albumResponse.data[0];

  // Search through all tracks for a preview URL
  let previewUrl = null;
  const tracklist =
    album.relationships?.tracks?.data.map((track: any) => ({
      trackNumber: track.attributes.trackNumber,
      name: track.attributes.name,
      duration: track.attributes.durationInMillis,
    })) || [];

  if (album.relationships?.tracks?.data) {
    for (const track of album.relationships.tracks.data) {
      if (track.attributes?.previews?.[0]?.url) {
        previewUrl = track.attributes.previews[0].url;
        break; // Stop loop once a preview is found
      }
    }
  }

  // Return album details including tracklist
  return {
    name: album.attributes.name, // Album name
    artist: album.attributes.artistName, // Artist name
    artistUrl: album.relationships?.artists?.data?.[0]?.href
      ? `https://music.apple.com${album.relationships.artists.data[0].href}`
      : null, // Artist URL
    year: album.attributes.releaseDate.split("-")[0], // Release year
    coverUrl: album.attributes.artwork.url.replace("{w}", "300").replace("{h}", "300"), // Album cover
    albumUrl: album.attributes.url, // Album URL
    previewUrl: previewUrl, // Preview URL
    tracklist, // Tracklist
  };
}

/**
 * Searches for albums on Apple Music using the provided artist name and album name.
 *
 * @param artistName The name of the artist to search for.
 * @param albumName The name of the album to search for. If not provided, only the artist name is used.
 * @param developerToken The Apple Music developer token used to authenticate the API request.
 *
 * @returns A promise that resolves to an array of detailed album information objects, each containing:
 *   - name: The name of the album.
 *   - artist: The name of the first artist.
 *   - artistUrl: The Apple Music URL of the artist.
 *   - year: The release year of the album.
 *   - coverUrl: The URL of the album cover image.
 *   - albumUrl: The Apple Music URL of the album.
 *   - previewUrl: A preview URL of a track in the album, if available.
 *   - tracklist: An array of track objects, each containing:
 *     - trackNumber: The track number.
 *     - name: The name of the track.
 *     - duration: The duration of the track in milliseconds.
 *     - previewUrl: A preview URL of the track, if available.
 */
export async function searchAppleMusicAlbums(
  artistName: string,
  albumName: string,
  developerToken: string
): Promise<any[]> {
  const query = albumName
    ? `${encodeURIComponent(artistName)} ${encodeURIComponent(albumName)}`
    : encodeURIComponent(artistName);

  // API-Aufruf mit Fetch
  const response = await fetch(`https://api.music.apple.com/v1/catalog/de/search?term=${query}&types=albums&limit=5`, {
    headers: {
      Authorization: `Bearer ${developerToken}`,
    },
  });

  if (!response.ok) {
    console.error("Apple Music API Error:", response.status, response.statusText);
    throw new Error(`Apple Music API request failed: ${response.statusText}`);
  }

  const data: any = await response.json();

  if (!data || typeof data !== "object") {
    console.error("Apple Music API returned unexpected data:", data);
    throw new Error("Unexpected API response structure");
  }

  if (!data.results || !data.results.albums || !data.results.albums.data) {
    console.error("Apple Music API returned unexpected data:", data);
    throw new Error("Unexpected API response structure");
  }

  // Verwende die Album-ID aus der Suchantwort, um detaillierte Informationen zu erhalten
  const albums = await Promise.all(
    data.results.albums.data.map(async (album: any) => {
      const albumId = album.id;
      console.log(`Fetching detailed info for album ID: ${albumId}`);
      return getAppleMusicAlbumDetails(albumId, developerToken); // Nutze die `getAppleMusicAlbumDetails` Funktion
    })
  );

  return albums;
}

/**
 * Retrieves the details of a Deezer album.
 *
 * @param albumId - The ID of the album to retrieve details for.
 *
 * @returns A promise that resolves to an object containing the following properties:
 *   - name: The name of the album.
 *   - artist: The name of the artist.
 *   - artistUrl: The Deezer URL of the artist.
 *   - year: The release year of the album.
 *   - coverUrl: The URL of the album cover image.
 *   - albumUrl: The Deezer URL of the album.
 *   - previewUrl: A preview URL of a track in the album, if available.
 *   - tracklist: An array of track objects, each containing:
 *     - trackNumber: The track number.
 *     - name: The name of the track.
 *     - duration: The duration of the track in milliseconds.
 * @throws Throws an error if the Deezer API request fails.
 */
export async function getDeezerAlbumDetails(albumId: string): Promise<any> {
  // Fetch album details from Deezer API
  const response = await fetch(`https://api.deezer.com/album/${albumId}`);

  // Check if the response is not okay and throw an error if needed
  if (!response.ok) {
    throw new Error(`Deezer API request failed: ${response.statusText}`);
  }

  // Parse the response as JSON
  const album: any = await response.json();

  // Initialize a preview URL variable
  let previewUrl = null;

  // Map track data to extract tracklist details
  const tracklist =
    album.tracks?.data.map((track: any, index: number) => ({
      trackNumber: index + 1, // Use the index as track number (1-based index)
      name: track.title, // Track name
      duration: track.duration * 1000, // Convert duration from seconds to milliseconds
    })) || [];

  // Search for a preview URL in the track data
  if (album.tracks?.data) {
    for (const track of album.tracks.data) {
      if (track.preview) {
        previewUrl = track.preview;
        break; // Stop loop once a preview is found
      }
    }
  }

  // Return album details including tracklist
  return {
    name: album.title, // Album name
    artist: album.artist.name, // Artist name
    artistUrl: `https://www.deezer.com/artist/${album.artist.id}`, // Artist URL
    year: album.release_date ? album.release_date.split("-")[0] : "Unknown", // Release year
    coverUrl: album.cover_medium, // Album cover
    albumUrl: album.link, // Album URL
    previewUrl: previewUrl || null, // Preview URL
    tracklist, // Tracklist
  };
}

/**
 * Searches for albums on Deezer using the provided artist name and album name.
 *
 * @param artistName The name of the artist to search for.
 * @param albumName The name of the album to search for. If not provided, only the artist name is used.
 * @returns A promise that resolves to an array of detailed album information objects, each containing:
 *   - name: The name of the album.
 *   - artist: The name of the artist.
 *   - artistUrl: The Deezer URL of the artist.
 *   - year: The release year of the album.
 *   - coverUrl: The URL of the album cover image.
 *   - albumUrl: The Deezer URL of the album.
 *   - previewUrl: A preview URL of a track in the album, if available.
 *   - tracklist: An array of track objects, each containing:
 *     - trackNumber: The track number.
 *     - name: The name of the track.
 *     - duration: The duration of the track in milliseconds.
 *     - previewUrl: A preview URL of the track, if available.
 */
export async function searchDeezerAlbums(artistName: string, albumName: string): Promise<any[]> {
  // Encode the search query using the artist and album names
  const query = albumName
    ? `${encodeURIComponent(artistName)} ${encodeURIComponent(albumName)}`
    : encodeURIComponent(artistName);

  // Send a request to the Deezer API to search for albums
  const response = await fetch(`https://api.deezer.com/search/album?q=${query}&limit=5`);

  if (!response.ok) {
    throw new Error(`Deezer API request failed: ${response.statusText}`);
  }

  // Parse the response as JSON
  const data: any = await response.json();

  if (!data.data || data.data.length === 0) {
    throw new Error("Keine Alben gefunden");
  }

  // Alben durchsuchen und detaillierte Informationen abrufen
  const albums = await Promise.all(
    data.data.map(async (album: any) => {
      const albumId = album.id;
      console.log(`Fetching detailed info for Deezer album ID: ${albumId}`);
      return getDeezerAlbumDetails(albumId);
    })
  );

  return albums;
}

/**
 * Searches for albums on all music platforms (Spotify, Apple Music, Deezer) using the provided artist name and album name.
 *
 * @param artistName The name of the artist to search for.
 * @param albumName The name of the album to search for. If not provided, only the artist name is used.
 * @returns A promise that resolves to an object containing the top 5 albums from each platform, each containing:
 *   - name: The name of the album.
 *   - artist: The name of the artist.
 *   - artistUrl: The platform-specific URL of the artist.
 *   - year: The release year of the album.
 *   - coverUrl: The URL of the album cover image.
 *   - albumUrl: The platform-specific URL of the album.
 *   - previewUrl: A preview URL of a track in the album, if available.
 *   - tracklist: An array of track objects, each containing:
 *     - trackNumber: The track number.
 *     - name: The name of the track.
 *     - duration: The duration of the track in milliseconds.
 *     - previewUrl: A preview URL of the track, if available.
 */
export async function searchAllPlatforms(artistName: string, albumName: string): Promise<SearchResults> {
  console.log("Starting album search for:", artistName, albumName);

  try {
    // Fetch tokens for all platforms
    console.log("Fetching tokens...");
    const spotifyAccessToken = await getSpotifyAccessToken(
      import.meta.env.SPOTIFY_CLIENT_ID,
      import.meta.env.SPOTIFY_CLIENT_SECRET
    );
    console.log("Obtained Spotify Access Token:", spotifyAccessToken);

    const appleMusicToken = getAppleMusicToken();
    console.log("Obtained Apple Music Token:", appleMusicToken);

    if (!spotifyAccessToken || !appleMusicToken) {
      throw new Error("API keys are missing. Check your environment variables.");
    }

    // Perform search on all platforms
    console.log("Initiating search on all platforms...");
    const [spotifyAlbums, appleAlbums, deezerAlbums] = await Promise.all([
      searchSpotifyAlbums(artistName, albumName, spotifyAccessToken),
      searchAppleMusicAlbums(artistName, albumName, appleMusicToken),
      searchDeezerAlbums(artistName, albumName),
    ]);

    console.log("Albums successfully found:", { spotifyAlbums, appleAlbums, deezerAlbums });

    // Return top 5 albums from each platform
    console.log("Displaying top 5 albums from each platform...");
    return {
      spotify: spotifyAlbums.slice(0, 5),
      appleMusic: appleAlbums.slice(0, 5),
      deezer: deezerAlbums.slice(0, 5),
    };
  } catch (error) {
    console.error("Error during platform search:", error);
    throw error;
  }
}
