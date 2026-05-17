import React, { Suspense } from 'react';
import CheckOutPagePageMain from './PageMain';

// PageMain (client component) calls useSearchParams; Suspense required for
// Next 14 static prerender. fallback={null} preserves the prior look.
const Page = () => {
  return (
    <Suspense fallback={null}>
      <CheckOutPagePageMain />
    </Suspense>
  );
};

export default Page;
