import React from 'react';
import { useReadingProgress } from '../hooks/useReadingProgress';

const ReadingProgressBar = () => {
  const progress = useReadingProgress();

  return (
    <div
      className="reading-progress"
      style={{ width: `${progress}%` }}
    />
  );
};

export default ReadingProgressBar;
