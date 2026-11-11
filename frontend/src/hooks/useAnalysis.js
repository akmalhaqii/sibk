// State hasil analisis (fields, validation, metrics, tiering, market, valuation, narrative)
import { useState } from 'react';

export function useAnalysis() {
  const [result, setResult] = useState(null);
  const [stage, setStage] = useState('idle');
  return { result, setResult, stage, setStage };
}