import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../store';
import { ApiClient } from '../lib/api';

interface ChatMessage {
  id: string;
  userId: string;
  user: string;
  text: string;
  platform: string;
  originPlatform: string;
  avatar?: string;
  pronouns?: string;
  decoration?: string;
  messageDecoration?: string;
  color?: string;
  timestamp: number;
}

export const Chat: React.FC = () => {
  const { session } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Connect to chat stream on mount
  useEffect(() => {
    connectToChat();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const connectToChat = () => {
    try {
      setIsConnecting(true);
      const es = new EventSource(`${ApiClient.baseURL}/chat/stream`);

      es.addEventListener('message', (e: Event) => {
        try {
          const messageEvent = e as MessageEvent;
          const data = JSON.parse(messageEvent.data);

          if (data.type === 'history') {
            setMessages(data.messages || []);
          } else if (data.type === 'chat') {
            setMessages((prev) => [...prev, data.message]);
          }
        } catch (err) {
          console.error('Failed to parse chat message:', err);
        }
      });

      es.addEventListener('error', () => {
        console.error('Chat connection error');
        eventSourceRef.current?.close();
        setIsConnected(false);
        setTimeout(connectToChat, 5000);
      });

      es.addEventListener('open', () => {
        setIsConnecting(false);
        setIsConnected(true);
      });

      eventSourceRef.current = es;
    } catch (error) {
      console.error('Failed to connect to chat:', error);
      setIsConnecting(false);
      setTimeout(connectToChat, 5000);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !session?.user) return;

    try {
      const response = await ApiClient.post('/chat/send', {
        text: inputValue,
        user: session.user.display || 'Adventurer',
        platform: 'nexus',
        originPlatform: 'nexus',
        avatar: session.user.avatar,
        userId: session.user.id,
      });

      if (response.ok) {
        setInputValue('');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div className="panel h-full">
      <div className="panel-header flex items-center justify-between">
        <span>Live Chat</span>
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected
                ? 'bg-green-500 animate-pulse'
                : isConnecting
                ? 'bg-yellow-500 animate-pulse'
                : 'bg-red-500'
            }`}
          />
          <span className="text-xs text-gray-400">
            {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="panel-body flex flex-col gap-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm italic">
            No messages yet
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className="flex gap-2 p-2 rounded-md bg-white/5 border-l-2 border-transparent hover:bg-white/10 animate-fadeIn"
            >
              {msg.avatar && (
                <img
                  src={msg.avatar}
                  alt={msg.user}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span
                    className="font-bold text-sm"
                    style={{ color: msg.color || '#d57bff' }}
                  >
                    {msg.user}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-sm text-gray-200 break-words font-['Marcellus'] leading-relaxed">
                  {msg.text}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 p-4 bg-black/20 border-t border-purple-500/20">
        {session?.user ? (
          <form onSubmit={handleSendMessage} className="w-full">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Send a message..."
                className="flex-1 px-4 py-3 rounded-full bg-black/30 border border-white/15 text-white placeholder-gray-400 outline-none focus:border-purple-500 focus:bg-black/50 transition-colors font-['Marcellus']"
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="px-4 py-3 bg-purple-500/20 border border-purple-500 text-purple-200 rounded-full font-bold hover:bg-purple-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ➜
              </button>
            </div>
            <button
              type="button"
              className="w-full bg-purple-900/15 border border-purple-500 text-purple-200 py-2 rounded text-xs font-bold uppercase hover:bg-purple-900/35 transition-colors flex items-center justify-center gap-1.5"
            >
              <img
                src="https://data.wolfethyst.tv/assets/wolfe_crystal"
                alt="crystal"
                className="w-3.5 h-3.5"
              />
              Tip (Coming Soon)
            </button>
          </form>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-400 text-sm">Sign in to chat</p>
          </div>
        )}
      </div>
    </div>
  );
};
