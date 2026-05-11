import React from 'react';
import Image from 'next/image';

const LogoSvgLight = () => {
  return (
    <Image
      src="/images/logo/searchumrah_logo.png"
      alt="Searchumrah logo"
      width={200}
      height={40}
      className="w-full dark:block"
      aria-label="Searchumrah"
      priority
    />
  );
};

export default LogoSvgLight;
