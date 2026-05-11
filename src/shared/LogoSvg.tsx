import Image from 'next/image';
import React from 'react';

const LogoSvg = () => {
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

export default LogoSvg;
