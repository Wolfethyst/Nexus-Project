import React from 'react';

export const NotFoundPage: React.FC = () => (
  <div className="flex items-center justify-center h-screen bg-nexus-dark">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <h1 className="text-2xl font-bold text-red-400 mb-2">404 - Not Found</h1>
      <p className="text-muted">The page you requested does not exist.</p>
    </div>
  </div>
);