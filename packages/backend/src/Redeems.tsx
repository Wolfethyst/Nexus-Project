import React, { useState } from 'react';
import { useRedeems } from '../hooks/useRedeems';
import { useAuth } from '../hooks/useAuth';

export const Redeems: React.FC = () => {
  const { redeems, loading, triggerRedeem, triggerTTS } = useRedeems();
    </div>
  );
};