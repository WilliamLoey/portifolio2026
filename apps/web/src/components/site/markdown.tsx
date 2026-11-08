import ReactMarkdown from 'react-markdown';

/**
 * Renders CMS Markdown. Raw HTML is not allowed (react-markdown escapes it by default),
 * and links are restricted to http(s) and mailto.
 */
export function Markdown({ children, lang }: { children: string; lang?: string }) {
  return (
    <div className="prose-body" lang={lang}>
      <ReactMarkdown
        skipHtml
        urlTransform={(url) => (/^(https?:|mailto:|\/|#)/i.test(url) ? url : '')}
        components={{
          a: ({ href, children: text }) => {
            const external = href?.startsWith('http');
            return (
              <a href={href} {...(external && { target: '_blank', rel: 'noopener noreferrer' })}>
                {text}
              </a>
            );
          },
          h1: ({ children: text }) => <h2>{text}</h2>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
