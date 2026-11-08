/**
 * The site's signature detail: each section is labelled with the real API request that
 * serves its content. Decorative for sighted users, so it is hidden from assistive tech.
 */
export function RequestLine({
  method = 'GET',
  path,
  status = 200,
  className = '',
}: {
  method?: string;
  path: string;
  status?: number;
  className?: string;
}) {
  return (
    <p aria-hidden className={`request-line flex flex-wrap items-center gap-x-2 ${className}`}>
      <span className="text-cool">{method}</span>
      <span className="break-all">/v1{path}</span>
      <span className="text-ok">{status}</span>
    </p>
  );
}

export function SectionHeading({
  id,
  request,
  title,
  lead,
  action,
  method,
  status,
}: {
  id: string;
  request: string;
  method?: string;
  status?: number;
  title: string;
  lead?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex max-w-2xl flex-col gap-3">
        <RequestLine path={request} method={method} status={status} />
        <h2 id={id} className="text-3xl font-extrabold sm:text-4xl md:text-5xl">
          {title}
        </h2>
        {lead && <p className="text-lg text-muted">{lead}</p>}
      </div>
      {action}
    </header>
  );
}
