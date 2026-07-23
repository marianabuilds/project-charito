import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ModeToggle } from './ModeToggle';

describe('ModeToggle', () => {
  it('renders both gentle and strict options', () => {
    render(<ModeToggle />);
    expect(
      screen.getByLabelText(/Gentle reminders/i),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Strict mode/i),
    ).toBeInTheDocument();
  });

  it('switches to strict mode when strict radio is clicked', () => {
    render(<ModeToggle />);
    const strictOption = screen.getByLabelText(
      /Strict mode/i,
    ) as HTMLInputElement;
    fireEvent.click(strictOption);
    expect(strictOption.checked).toBe(true);
  });

  it('switches back to gentle mode', () => {
    render(<ModeToggle />);
    const gentleOption = screen.getByLabelText(
      /Gentle reminders/i,
    ) as HTMLInputElement;
    fireEvent.click(gentleOption);
    expect(gentleOption.checked).toBe(true);
  });
});
