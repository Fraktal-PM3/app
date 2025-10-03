import { expect } from 'vitest';
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';

const matchers = (jestDomMatchers as any).default ?? jestDomMatchers;
expect.extend(matchers);
