import React from 'react';

const LogoSvgLight = () => {
  return (
    <svg
      className="w-full hidden dark:block"
      viewBox="0 0 200 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Hajjscanner"
    >
      <g>
        <rect x="2" y="6" width="32" height="32" rx="6" fill="#F8FAFC" />
        <rect x="2" y="14" width="32" height="3.5" fill="#F59E0B" />
        <circle cx="18" cy="11" r="1.5" fill="#F59E0B" opacity="0.85" />
      </g>
      <text
        x="42"
        y="29"
        fontFamily="Poppins, system-ui, sans-serif"
        fontSize="20"
        fontWeight="700"
        fill="#F8FAFC"
        letterSpacing="-0.5"
      >
        Hajj
        <tspan fontWeight="500" fill="#A5B4FC">
          scanner
        </tspan>
      </text>
    </svg>
  );
};

export default LogoSvgLight;
