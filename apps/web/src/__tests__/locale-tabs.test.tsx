import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { LocaleTabs } from '@/components/dashboard/locale-tabs';
import type { Locale } from '@portfolio/contracts';

function Harness() {
  const [active, setActive] = useState<Locale>('en');
  return (
    <LocaleTabs active={active} onChange={setActive} filled={{ en: true, fr: true }} errors={{ fr: true }}>
      <p>Panel for {active}</p>
    </LocaleTabs>
  );
}

describe('LocaleTabs', () => {
  it('marks translated, missing and invalid languages', () => {
    render(<Harness />);
    expect(screen.getByRole('tab', { name: /EN/ })).toHaveAccessibleName(/translated/);
    expect(screen.getByRole('tab', { name: /FR/ })).toHaveAccessibleName(/has errors/);
    expect(screen.getByRole('tab', { name: /NL/ })).toHaveAccessibleName(/not translated/);
  });

  it('switches with the arrow keys and explains the English fallback', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    screen.getByRole('tab', { selected: true }).focus();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(screen.getByRole('tab', { selected: true })).toHaveAccessibleName(/NL/);
    expect(screen.getByText('Panel for nl')).toBeInTheDocument();
    expect(screen.getByText(/Dutch is empty/)).toBeInTheDocument();
  });
});
