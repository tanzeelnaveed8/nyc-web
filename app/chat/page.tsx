'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { Colors } from '@/lib/theme/colors';
import Navigation from '@/components/Navigation';
import { getCurrentLocation, findNearbyNYPDPrecinct } from '@/lib/utils/geo';
import { findNearestPrecinct, getPrecinctByNumber } from '@/lib/db/database';
import { Send, Loader2, MapPin, AlertCircle } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export default function ChatPage() {
  const { theme } = useTheme();
  const colors = theme === 'dark' ? Colors.dark : Colors.light;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Welcome message
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: 'Hello! I\'m your NYC Precinct AI assistant. I can help you find information about NYPD precincts, answer questions about your location, and provide guidance. How can I help you today?',
        timestamp: Date.now(),
      },
    ]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setLocationError('');

    try {
      // Get user location
      let location = null;
      let precinct = null;

      try {
        const position = await getCurrentLocation();
        location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        // Ask Google which NYPD precinct covers this location (same as mobile app)
        const nearbyNum = await findNearbyNYPDPrecinct(location.latitude, location.longitude);

        if (nearbyNum) {
          precinct = await getPrecinctByNumber(nearbyNum);
        }

        // Fallback to nearest centroid if Google didn't find one
        if (!precinct) {
          precinct = await findNearestPrecinct(location);
        }
      } catch (err) {
        console.error('[Chat] Location error:', err);
        setLocationError('Could not get your location. Please enable location access.');
      }

      // Call backend API
      const response = await fetch(`${process.env.NEXT_PUBLIC_CHAT_API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          latitude: location?.latitude,
          longitude: location?.longitude,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || 'Sorry, I could not process your request.',
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('[Chat] Error:', error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please make sure the backend server is running at http://localhost:3002 and try again.',
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: colors.background }}>
      <Navigation />

      <main className="flex-1 mt-16 md:mb-0 mb-20 flex flex-col max-w-4xl mx-auto w-full">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className="max-w-[80%] px-4 py-3 rounded-2xl"
                style={{
                  backgroundColor: message.role === 'user' ? colors.accent : colors.surface,
                  color: message.role === 'user' ? colors.onAccentContrast : colors.textPrimary,
                  border: message.role === 'assistant' ? `1px solid ${colors.cardBorder}` : 'none',
                }}
              >
                <p className="text-sm font-semibold whitespace-pre-wrap">{message.content}</p>
                <p
                  className="text-xs mt-1 opacity-70"
                  style={{
                    color: message.role === 'user' ? colors.onAccentContrast : colors.textTertiary,
                  }}
                >
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div
                className="px-4 py-3 rounded-2xl flex items-center gap-2"
                style={{
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.cardBorder}`,
                }}
              >
                <Loader2 className="animate-spin" size={16} style={{ color: colors.accent }} />
                <p className="text-sm font-semibold" style={{ color: colors.textSecondary }}>
                  Thinking...
                </p>
              </div>
            </div>
          )}

          {locationError && (
            <div
              className="flex items-start gap-2 p-3 rounded-xl"
              style={{
                backgroundColor: colors.error + '20',
                border: `1px solid ${colors.error}`,
              }}
            >
              <AlertCircle size={18} style={{ color: colors.error }} className="flex-shrink-0 mt-0.5" />
              <p className="text-xs font-semibold" style={{ color: colors.error }}>
                {locationError}
              </p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t" style={{ borderColor: colors.cardBorder }}>
          <div
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.outline}`,
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask me anything about NYC precincts..."
              className="flex-1 bg-transparent outline-none text-sm font-semibold"
              style={{ color: colors.textPrimary }}
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="p-2 rounded-lg transition-all hover:scale-110 disabled:opacity-50 disabled:hover:scale-100"
              style={{
                backgroundColor: colors.accent,
                color: colors.onAccentContrast,
              }}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>

          <p className="text-xs mt-2 text-center" style={{ color: colors.textTertiary }}>
            💡 Tip: Enable location access for personalized responses
          </p>
        </div>
      </main>
    </div>
  );
}
