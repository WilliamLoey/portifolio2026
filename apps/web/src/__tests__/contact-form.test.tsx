import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContactForm } from '@/components/site/contact-form';
import messages from '../../messages/pt-BR.json';

function renderForm() {
  return render(
    <NextIntlClientProvider locale="pt-BR" messages={messages}>
      <ContactForm />
    </NextIntlClientProvider>,
  );
}

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nome'), 'Ana Souza');
  await user.type(screen.getByLabelText('E-mail'), 'ana@example.com');
  await user.type(screen.getByLabelText('Assunto'), 'Vaga backend');
  await user.type(screen.getByLabelText('Mensagem'), 'Olá William, temos uma vaga que combina com você.');
}

describe('ContactForm', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows translated errors from the shared schema and does not submit', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }));

    expect(await screen.findByText('Informe seu nome.')).toBeInTheDocument();
    expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts to the API with the locale and anti-spam fields, then confirms', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderForm();

    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Obrigado'));
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://api.test/api/v1/contact');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ name: 'Ana Souza', locale: 'pt-BR', website: '' });
    expect(typeof body.startedAt).toBe('number');
  });

  it('explains rate limiting instead of a generic error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 429 })));
    const user = userEvent.setup();
    renderForm();

    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Muitas mensagens');
  });
});
