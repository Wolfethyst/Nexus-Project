import React, { useState } from 'react';
import { useStore } from '../hooks/useStore';
import { useAuthStore } from '../store';

export const Marketplace: React.FC = () => {
  const { session } = useAuthStore();
  const { items, loading: itemsLoading } = useStore();
  const { purchase } = useStore();
  const [purchasing, setPurchasing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handlePurchase = async (itemId: string) => {
    if (!session) return;

    setPurchasing(true);
    const result = await purchase(itemId);

    if (result.ok) {
      setMessage({ type: 'success', text: `Purchased! Points remaining: ${result.pointsAfter}` });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: result.error || 'Purchase failed' });
      setTimeout(() => setMessage(null), 3000);
    }
    setPurchasing(false);
  };

  if (!session) {
    return (
      <div className="panel h-full">
        <div className="panel-header">
          <span>Marketplace</span>
        </div>
        <div className="panel-body flex items-center justify-center">
          <p className="text-gray-400">Please log in to access the marketplace</p>
        </div>
      </div>
    );
  }

  if (itemsLoading) {
    return (
      <div className="panel h-full">
        <div className="panel-header">
          <span>Marketplace</span>
        </div>
        <div className="panel-body flex items-center justify-center">
          <p className="text-gray-400">Loading marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel h-full">
      <div className="panel-header">
        <span>Marketplace</span>
      </div>

      <div className="panel-body flex flex-col gap-2 overflow-y-auto">
        {message && (
          <div className={`p-2 rounded-md text-sm ${message.type === 'success' ? 'bg-green-500/20 border border-green-500/50 text-green-400' : 'bg-red-500/20 border border-red-500/50 text-red-400'}`}>
            {message.text}
          </div>
        )}

        {items.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 italic">No items available</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-between justify-between p-3 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white truncate">{item.name}</h3>
                {item.description && (
                  <p className="text-sm text-gray-400 truncate">{item.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3 ml-2">
                <div className="text-right">
                  <div className="text-sm font-bold text-purple-300">{item.cost}</div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePurchase(item.id);
                    }}
                    disabled={purchasing}
                    className="mt-1 px-3 py-1 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 rounded text-xs font-semibold text-white transition-colors"
                  >
                    {purchasing ? 'Buying...' : 'Buy'}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
