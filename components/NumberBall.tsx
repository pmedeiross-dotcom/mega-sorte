
import React from 'react';

interface NumberBallProps {
  num: number;
  isSelected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const NumberBall: React.FC<NumberBallProps> = ({ num, isSelected, onClick, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm md:w-12 md:h-12 md:text-base',
    lg: 'w-14 h-14 text-lg md:w-16 md:h-16 md:text-xl'
  };

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center justify-center rounded-full font-bold transition-all duration-200 shadow-md
        ${sizeClasses[size]}
        ${isSelected 
          ? 'bg-emerald-600 text-white border-2 border-emerald-400 scale-110' 
          : 'bg-white text-emerald-800 border-2 border-emerald-100 hover:border-emerald-300'
        }
      `}
    >
      {num.toString().padStart(2, '0')}
    </button>
  );
};

export default NumberBall;
