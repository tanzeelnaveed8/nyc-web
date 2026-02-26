# NYC Precinct Web App - Quick Start Guide

## ✅ Setup Complete!

Your Next.js web app is ready to run!

## 🚀 How to Run

### 1. Start the Backend (for Chat feature)

```bash
cd C:\tanzeel-work\nyc\NYC-APP\backend
npm install
npm run dev
```

Backend will run on: `http://localhost:3002`

### 2. Start the Web App

```bash
cd C:\tanzeel-work\nyc\nyc-web
npm run dev
```

Web app will run on: `http://localhost:3000`

### 3. Open in Browser

Navigate to: **http://localhost:3000**

## 📱 Features Available

✅ **Map** - Interactive Google Maps with precinct boundaries
✅ **Search** - Find precincts by address
✅ **Chat** - AI assistant (requires backend)
✅ **Laws** - NYC law categories
✅ **Calendar** - RDO schedules
✅ **Sectors** - Precinct sectors info
✅ **Settings** - Dark mode, map settings, favorites

## 🔑 Environment Variables

Already configured in `.env.local`:

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyAy6Un1PzgY5BgUNwgbch9dES5yE9En96I
NEXT_PUBLIC_CHAT_API_URL=http://localhost:3002
```

## 🎨 Theme & Colors

- Same colors as mobile app
- Dark/Light mode toggle
- Responsive design (mobile + desktop)

## 📦 What's Included

- ✅ Next.js 15 (App Router)
- ✅ TypeScript
- ✅ Tailwind CSS
- ✅ Google Maps integration
- ✅ IndexedDB (Dexie.js)
- ✅ All mobile app features
- ✅ Responsive navigation
- ✅ Dark mode support

## 🛠️ Build for Production

```bash
npm run build
npm start
```

## 📝 Notes

- Location permission needed for "Where Am I?" feature
- Backend must run for chat to work
- Data loads automatically on first visit
- All precinct data stored in browser (IndexedDB)

## 🎯 Next Steps

1. Test all features
2. Customize as needed
3. Deploy to Vercel/Netlify
4. Update API keys for production

---

**Ready to go!** 🚀
