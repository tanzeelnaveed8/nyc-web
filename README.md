# NYC Precinct Web App

A modern Next.js web application for finding NYPD precincts, exploring sectors, and accessing NYC law information.

## Features

- 🗺️ **Interactive Map** - Google Maps integration with precinct boundaries
- 🔍 **Address Search** - Find your precinct by searching any NYC address
- 💬 **AI Chat Assistant** - Ask questions about precincts using OpenAI
- ⚖️ **Laws Database** - Browse NYC laws and regulations
- 📅 **RDO Calendar** - View squad schedules
- 🎯 **Sectors Map** - Explore precinct sectors
- ⭐ **Favorites** - Save your frequently accessed precincts
- 🌓 **Dark Mode** - Full dark/light theme support

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Google Maps JavaScript API**
- **IndexedDB** (via Dexie.js)
- **OpenAI API** (for chat assistant)

## Prerequisites

- Node.js 18+ installed
- Google Maps API key
- OpenAI API key (for chat feature)

## Installation

1. **Clone or navigate to the project:**
   ```bash
   cd C:\tanzeel-work\nyc\nyc-web
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**

   The `.env.local` file is already created with default values:
   ```
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyAy6Un1PzgY5BgUNwgbch9dES5yE9En96I
   NEXT_PUBLIC_CHAT_API_URL=http://localhost:3002
   ```

   Update these if needed.

4. **Start the backend (for chat feature):**
   ```bash
   cd ../NYC-APP/backend
   npm install
   npm run dev
   ```

   The backend should run on `http://localhost:3002`

5. **Start the Next.js development server:**
   ```bash
   cd ../nyc-web
   npm run dev
   ```

6. **Open your browser:**
   ```
   http://localhost:3000
   ```

## Project Structure

```
nyc-web/
├── app/                    # Next.js App Router pages
│   ├── map/               # Map page
│   ├── search/            # Search page
│   ├── chat/              # Chat assistant page
│   ├── laws/              # Laws page
│   ├── calendar/          # Calendar page
│   ├── sectors/           # Sectors page
│   ├── settings/          # Settings page
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page (redirects to map)
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── Navigation.tsx     # Main navigation
│   ├── ThemeProvider.tsx  # Theme context
│   └── map/              # Map-specific components
├── lib/                   # Utilities and logic
│   ├── context/          # React contexts
│   ├── db/               # IndexedDB database
│   ├── theme/            # Theme colors
│   └── utils/            # Utility functions
├── data/                  # Static data files
│   ├── precinctBoundaries.json
│   ├── precinctData.json
│   └── precinctLocations.json
├── types/                 # TypeScript types
└── public/               # Static assets
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Features Overview

### Map
- Auto-detects user location on load
- Click anywhere to find precinct
- Toggle precinct boundaries
- Save favorites
- Get directions

### Search
- Search any NYC address
- Recent search history
- Quick navigation to map

### Chat Assistant
- AI-powered responses
- Location-aware answers
- Precinct information

### Settings
- Dark/Light mode toggle
- Map type selection (Standard/Satellite/Terrain)
- Boundary visibility toggle
- Manage favorites

## Database

The app uses **IndexedDB** (browser storage) via Dexie.js to store:
- Precinct data
- Sectors
- Recent searches
- Favorites
- User preferences

Data is automatically loaded on first visit.

## API Integration

### Google Maps API
Used for:
- Map rendering
- Geocoding (address → coordinates)
- Reverse geocoding (coordinates → address)

### Backend API (Chat)
Endpoint: `POST /api/chat`

Request:
```json
{
  "message": "Where is my nearest precinct?",
  "latitude": 40.7128,
  "longitude": -74.006
}
```

Response:
```json
{
  "message": "Your nearest precinct is...",
  "precinctName": "1st Precinct",
  "address": "16 Ericsson Pl, New York, NY 10013"
}
```

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
   - `NEXT_PUBLIC_CHAT_API_URL`
4. Deploy

### Other Platforms

Build the app:
```bash
npm run build
```

Start production server:
```bash
npm start
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Notes

- Location permission required for "Where Am I?" feature
- Backend must be running for chat feature
- Google Maps API key needed for map functionality

## License

Private - All rights reserved

## Support

For issues or questions, contact the development team.
