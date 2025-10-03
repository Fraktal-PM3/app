import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import Hello from './Hello';


describe('Hello component', () => {
  it('renders greeting', () => {
    render(<Hello name="World" />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });
});