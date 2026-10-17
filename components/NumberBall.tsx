
import React from 'react';

interface NumberBallProps {
  num: number;
  isSelected?: boolean;
  isHit?: boolean;
  onClick?: () => void;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

const NumberBall: React.FC<NumberBallProps> = ({ 
  num, 
  isSelected, 
  isHit,
  onClick, 
  size = 'md',
  disabled = false
}) => {
  const sizeClasses = {
    xs: 'w-7 h-7 text-[11px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 text-xs sm:text-sm',
    lg: 'w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 text-sm sm:text-base md:text-lg'
  };

  let stateClasses = 'bg-white text-emerald-900 border border-emerald-200 hover:border-emerald-400 shadow-sm';

  if (isHit) {
    stateClasses = 'bg-gradient-to-br from-amber-400 to-yellow-500 text-amber-950 border-2 border-yellow-300 ring-2 ring-yellow-400/50 font-black shadow-md scale-105';
  } else if (isSelected) {
    stateClasses = 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-2 border-emerald-300 shadow-md scale-105 font-black';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Número ${num}`}
      aria-pressed={isSelected}
      className={`
        relative flex items-center justify-center rounded-full font-bold transition-all duration-150 select-none
        active:scale-95 disabled:pointer-events-none disabled:opacity-60
        ${sizeClasses[size]}
        ${stateClasses}
      `}
    >
      <span>{num.toString().padStart(2, '0')}</span>
      {isHit && (
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-500"></span>
        </span>
      )}
    </button>
  );
};

export default NumberBall;

