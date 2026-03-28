"use client";

import dynamic from 'next/dynamic';

const PdfSplitterClient = dynamic(() => import('./PdfSplitterClient'), {
  ssr: false,
});

export default function PdfSplitterDynamic() {
  return <PdfSplitterClient />;
}
