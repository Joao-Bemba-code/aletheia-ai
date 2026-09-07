import type { ComponentProps } from 'react';
import { IS_EXPO_GO } from '@/src/config';
import type { ScannerOverlayReal } from './ScannerOverlayReal';

export function ScannerOverlay(props: ComponentProps<typeof ScannerOverlayReal>) {
  if (IS_EXPO_GO) {
    const Demo = require('./ScannerOverlayDemo').ScannerOverlayDemo;
    return <Demo {...props} />;
  }
  const Real = require('./ScannerOverlayReal').ScannerOverlayReal;
  return <Real {...props} />;
}