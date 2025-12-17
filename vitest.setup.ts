import { expect } from 'vitest';
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';

type MatcherModule = typeof jestDomMatchers;
const m = jestDomMatchers as unknown;
const matchers = (m && typeof m === 'object' && 'default' in m
  ? (m as { default: MatcherModule }).default
  : m) as MatcherModule;

expect.extend(matchers);