import { StyleSheet, Text, View } from 'react-native';
import type { ComponentProps } from 'react';
import { IS_EXPO_GO } from '@/src/config';
import type { IncongruenceGaugeReal } from './IncongruenceGaugeReal';

export function IncongruenceGauge(props: ComponentProps<typeof IncongruenceGaugeReal>) {
  if (IS_EXPO_GO) {
    const Demo = require('./IncongruenceGaugeDemo').IncongruenceGaugeDemo;
    return <Demo {...props} />;
  }
  const Real = require('./IncongruenceGaugeReal').IncongruenceGaugeReal;
  return <Real {...props} />;
}