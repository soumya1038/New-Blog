import React from 'react';
import { motion } from 'framer-motion';

const WaveformBars = ({ count = 5, color = 'var(--primary)' }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '16px' }}>
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          style={{
            width: '3px',
            background: color,
            borderRadius: '2px',
          }}
          animate={{
            height: ['40%', '100%', '60%', '80%', '40%'],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

export default WaveformBars;
