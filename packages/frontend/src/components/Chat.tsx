import React, { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  color: string;
  timestamp: Date;
  avatar?: string;
}

export const Chat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      username: 'System',
      message: 'Welcome to Nexus chat!',
      color: '#d57bff',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      username: 'You',
      message: inputValue,
      color: '#72ffb0',
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    setInputValue('');
  };

  return (
    <div className="panel h-full">
      <div className="panel-header">
        <span>Live Chat</span>
      </div>

      <div className="panel-body flex flex-col gap-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="flex gap-2 p-2 rounded-md bg-white/5 border-l-2 border-transparent hover:bg-white/10 animate-fadeIn"
          >
            {msg.avatar && (
              <img
                src={msg.avatar}
                alt={msg.username}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span
                  className="font-bold text-sm"
                  style={{ color: msg.color }}
                >
                  {msg.username}
                </span>
                <span className="text-xs text-muted">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm text-gray-200 break-words font-['Marcellus'] leading-relaxed">
                {msg.message}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 p-4 bg-black/20 border-t border-purple-500/20">
        <form onSubmit={handleSendMessage} className="w-full">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Send a message..."
            className="w-full px-4 py-3 rounded-full bg-black/30 border border-white/15 text-white placeholder-gray-400 outline-none focus:border-purple-500 focus:bg-black/50 transition-colors font-['Marcellus']"
            autoComplete="off"
          />
        </form>
        <div className="mt-3 flex gap-2">
          <button className="flex-1 bg-purple-900/15 border border-purple-500 text-purple-200 py-2 rounded text-xs font-bold uppercase hover:bg-purple-900/35 transition-colors">
            💎 Tip
          </button>
        </div>
      </div>
    </div>
  );
};
