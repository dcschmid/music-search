# Music Search - Find Albums and Tracks on Spotify, Apple Music, and Deezer

This project is a web application that allows users to search for albums and tracks from multiple platforms, including Spotify, Apple Music, and Deezer. Users can enter an artist's name and optionally an album name, and the application will display albums along with their tracklists, album covers, preview URLs, and more.

## Features

- **Multi-Platform Search:** Search for albums and tracks across Spotify, Apple Music, and Deezer.
- **Tracklist Display:** View the full tracklist for each album, with formatted durations for each track.
- **Preview Track:** Listen to a 30-second preview of any track if available.
- **Download Album Cover:** Download album covers in a 300x300 pixel format.
- **Copy Preview URL:** Easily copy the preview URL of any track to the clipboard.

## Technologies Used

- **HTML/CSS:** For building the user interface and styling the application.
- **JavaScript (TypeScript):** To handle form submissions, fetch data from APIs, and dynamically update the DOM with results.
- **APIs Used:**
  - [Spotify API](https://developer.spotify.com/documentation/web-api/)
  - [Apple Music API](https://developer.apple.com/documentation/applemusicapi)
  - [Deezer API](https://developers.deezer.com/api)

## Installation and Setup

1. **Clone the repository:**

    ```bash
    git clone https://github.com/yourusername/music-search.git
    cd music-search
    ```

2. **Install dependencies:**

    This project relies on basic dependencies for fetching API data (Node.js) and serving the app.

    ```bash
    npm install
    ```

3. **Set up environment variables:**

    Create a `.env` file in the root directory and add your API credentials. You will need API tokens for Spotify, Apple Music, and Deezer.

    ```bash
    SPOTIFY_CLIENT_ID=your_spotify_client_id
    SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
    APPLE_MUSIC_KEY_ID=your_apple_music_key_id
    APPLE_MUSIC_TEAM_ID=your_apple_music_team_id
    APPLE_MUSIC_PRIVATE_KEY_PATH=/path/to/private/key.p8
    ```

4. **Run the application:**

    Start the local server to serve the application.

    ```bash
    npm run start
    ```

5. **Open the app in your browser:**

    Navigate to `http://localhost:3000` in your browser.

## Usage

1. **Search for Albums:**

   - Enter the artist's name in the search form.
   - Optionally, enter the name of a specific album.
   - Click "Suchen" to start the search.

2. **View Results:**
   - Albums from Spotify, Apple Music, and Deezer will be displayed, each with:
     - Album cover
     - Artist name
     - Release year
     - Preview of a track (if available)
     - Links to the artist's page and the album's page on the respective platform
     - Full tracklist with durations

3. **Download Album Cover:**
   - Click the "Cover herunterladen" button under each album to download the album cover in 300x300 pixels.

4. **Copy Preview URL:**
   - Click the "Preview kopieren" button to copy the preview URL of a track to your clipboard.

## Example Search

If you search for "Coldplay" without entering an album, the app will show the top albums for Coldplay on all three platforms. You can:
- Click on the album cover to listen to a preview.
- View the tracklist.
- Download the album cover image or copy the preview URL.

## API Rate Limits

Please note that the APIs for Spotify, Apple Music, and Deezer have rate limits. Ensure that your API usage does not exceed the limits, and handle API errors gracefully in your production application.

## Contributing

Contributions are welcome! If you'd like to contribute to this project, please fork the repository and submit a pull request.

## License

This project is open-source and licensed under the MIT License.
