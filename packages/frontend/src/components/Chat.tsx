import React, { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  color: string;
  timestamp: Date;
}

export const Chat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      username: 'System',
      message: 'Welcome to Nexus chat!',
      color: '#a855f7',
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
    <div className="glass-sidebar flex flex-col h-[calc(100vh-140px)]">
      <div className="mb-4 pb-4 border-b border-purple-500/20">
        <h3 className="font-heading text-xl font-bold text-nexus-accent">Live Chat</h3>
        <p className="text-xs text-muted mt-1">{messages.length} messages</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2 scrollbar-thin">
        {messages.map((msg) => (
          <div key={msg.id} className="animate-fadeIn">
            <div className="flex items-baseline gap-2">
              <span
                className="font-semibold text-sm"
                style={{ color: msg.color }}
              >
                {msg.username}
              </span>
              <span className="text-xs text-muted">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-sm text-primary mt-1">{msg.message}</p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="mt-auto">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Send a message..."
            className="flex-1 bg-nexus-dark/50 border border-purple-500/30 rounded-lg px-3 py-2 text-sm text-primary placeholder-muted focus:outline-none focus:border-nexus-accent transition-colors"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-nexus-accent text-white rounded-lg font-medium hover:bg-purple-600 transition-colors text-sm"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};
