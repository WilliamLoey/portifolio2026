import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusPill } from '@/components/dashboard/ui';

describe('StatusPill', () => {
  it.each([
    ['draft', 'Draft'],
    ['published', 'Published'],
    ['changed', 'Unpublished changes'],
  ] as const)('labels %s with text, not colour alone', (status, label) => {
    render(<StatusPill status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
