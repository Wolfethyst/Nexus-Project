import React, { useState } from 'react';
import { useRedeems } from '../hooks/useRedeems';
import { useAuth } from '../hooks/useAuth';

export const Redeems: React.FC = () => {
  const { redeems, loading, triggerRedeem, triggerTTS } = useRedeems();
  const { user } = useAuth();
  const [ttsMessage, setTtsMessage] = useState('');
  const [ttsStatus, setTtsStatus] = useState<{ok: boolean, msg: string} | null>(null);

  const handleTTS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ttsMessage.trim()) return;
    
    const result = await triggerTTS(ttsMessage);
    if (result.ok) {
      setTtsMessage('');
      setTtsStatus({ ok: true, msg: 'Message sent!' });
      setTimeout(() => setTtsStatus(null), 3000);
    } else {
      setTtsStatus({ ok: false, msg: result.error || 'Failed to send' });
    }
  };

  if (loading) return <div className="p-4 text-center">Loading redeems...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      <section>
        <h2 className="text-2xl font-bold mb-4 text-purple-400">Channel Redeems</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {redeems.map((redeem) => (
            <div key={redeem.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-lg">{redeem.name}</h3>
                <p className="text-gray-400 text-sm mb-2">{redeem.description}</p>
              </div>
              <button
                onClick={() => triggerRedeem(redeem.id)}
                disabled={!user || (user.points < redeem.cost)}
                className={`mt-4 w-full py-2 rounded font-bold transition-colors ${
                  !user || user.points < redeem.cost
                    ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                    : 'bg-purple-600 hover:bg-purple-500 text-white'
                }`}
              >
                Redeem ({redeem.cost})
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-2xl font-bold mb-4 text-blue-400">Text to Speech</h2>
        <p className="text-gray-400 mb-4">Send a message to the stream! (Cost: 250 points)</p>
        
        <form onSubmit={handleTTS} className="space-y-4">
          <textarea
            value={ttsMessage}
            onChange={e => setTtsMessage(e.target.value)}
            className="w-full p-2 rounded bg-gray-900 border border-gray-700 text-white"
            rows={3}
            maxLength={150}
            placeholder="Type your message..."
          />
          <button
            type="submit"
            className="w-full py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold"
            disabled={!user || !ttsMessage.trim()}
          >
            Send TTS
          </button>
        </form>
        {ttsStatus && (
          <div className={`mt-2 text-center font-bold ${ttsStatus.ok ? 'text-green-400' : 'text-red-400'}`}>{ttsStatus.msg}</div>
        )}
      </section>
    </div>
  );
};
