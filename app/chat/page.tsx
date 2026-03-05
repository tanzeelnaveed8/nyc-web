'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { Colors } from '@/lib/theme/colors';
import Navigation from '@/components/Navigation';
import { getCurrentLocation } from '@/lib/utils/geo';
import { Send, Loader2, MapPin, Navigation2, Bot, User } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const QUICK_LOCATIONS = [
  'Times Square',
  'Brooklyn Bridge',
  'Central Park',
  'Wall Street',
  'Harlem',
  'Bronx Zoo',
];

export default function ChatPage() {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? Colors.dark : Colors.light;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content:
          'Hello! I\'m your NYC Precinct Finder.\n\nTell me where you are and I\'ll find the nearest police precinct for you.\n\nYou can type a location like "Times Square" or tap a quick option below.',
        timestamp: Date.now(),
      },
    ]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const payload: Record<string, unknown> = { message: text.trim() };
      if (userCoords) {
        payload.latitude = userCoords.lat;
        payload.longitude = userCoords.lng;
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message || 'Sorry, something went wrong.',
          timestamp: Date.now(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Could not reach the server. Please try again.',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleUseMyLocation = async () => {
    if (gettingLocation || loading) return;
    setGettingLocation(true);

    try {
      const position = await getCurrentLocation();
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setUserCoords({ lat, lng });

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: '📍 Using my current location',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setLoading(true);

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'my current location', latitude: lat, longitude: lng }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message || 'Sorry, something went wrong.',
          timestamp: Date.now(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'user',
          content: '📍 Tried using current location',
          timestamp: Date.now(),
        },
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            'Could not get your location. Please make sure location access is enabled in your browser, or type a location manually.',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setGettingLocation(false);
      setLoading(false);
    }
  };

  const showQuickOptions = messages.length <= 1 && !loading;

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: colors.background }}>
      <Navigation />

      <main className="flex-1 mt-16 md:mb-0 mb-20 flex flex-col max-w-3xl mx-auto w-full">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{
                  backgroundColor: msg.role === 'user' ? colors.accent : colors.surfaceVariant,
                }}
              >
                {msg.role === 'user' ? (
                  <User size={16} style={{ color: colors.onAccent }} />
                ) : (
                  <Bot size={16} style={{ color: colors.primary }} />
                )}
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl ${msg.role === 'user' ? 'rounded-tr-md' : 'rounded-tl-md'}`}
                style={{
                  backgroundColor: msg.role === 'user' ? colors.accent : colors.surface,
                  color: msg.role === 'user' ? colors.onAccentContrast : colors.textPrimary,
                  border: msg.role === 'assistant' ? `1px solid ${colors.cardBorder}` : 'none',
                }}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                <p
                  className="text-[10px] mt-1.5 opacity-60"
                  style={{
                    color: msg.role === 'user' ? colors.onAccentContrast : colors.textTertiary,
                  }}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex items-start gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: colors.surfaceVariant }}
              >
                <Bot size={16} style={{ color: colors.primary }} />
              </div>
              <div
                className="px-4 py-3 rounded-2xl rounded-tl-md"
                style={{
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.cardBorder}`,
                }}
              >
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: colors.accent, animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: colors.accent, animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: colors.accent, animationDelay: '300ms' }} />
                  </div>
                  <p className="text-xs ml-1" style={{ color: colors.textSecondary }}>
                    Finding precinct...
                  </p>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick options (only shown initially) */}
        {showQuickOptions && (
          <div className="px-4 pb-2 space-y-3">
            {/* Use My Location button */}
            <button
              onClick={handleUseMyLocation}
              disabled={gettingLocation}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl transition-all hover:opacity-90 active:scale-[0.98]"
              style={{
                backgroundColor: colors.accent,
                color: colors.onAccentContrast,
              }}
            >
              {gettingLocation ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Navigation2 size={18} />
              )}
              <span className="text-sm font-semibold">
                {gettingLocation ? 'Getting location...' : 'Use My Current Location'}
              </span>
            </button>

            {/* Quick location chips */}
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  onClick={() => sendMessage(loc)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:opacity-80 active:scale-95"
                  style={{
                    backgroundColor: colors.surfaceVariant,
                    color: colors.textPrimary,
                    border: `1px solid ${colors.cardBorder}`,
                  }}
                >
                  <MapPin size={12} />
                  {loc}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input bar */}
        <div className="p-4 border-t" style={{ borderColor: colors.cardBorder }}>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.outline}`,
            }}
          >
            <MapPin size={18} style={{ color: colors.textTertiary }} className="flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
              placeholder="Type your location..."
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: colors.textPrimary }}
              disabled={loading}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="p-2 rounded-lg transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
              style={{
                backgroundColor: colors.accent,
                color: colors.onAccentContrast,
              }}
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
