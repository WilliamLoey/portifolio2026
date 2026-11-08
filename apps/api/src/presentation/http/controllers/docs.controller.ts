import { Controller, Get, Header } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { buildOpenApiDocument } from '@portfolio/contracts';
import { EnvService } from '../../../infrastructure/config/env.service';

const SWAGGER_UI = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14';
const BASE = '/api/v1/docs';

/** OpenAPI document generated from the shared route registry, plus a Swagger UI page. */
@SkipThrottle()
@Controller('docs')
export class DocsController {
  private document?: ReturnType<typeof buildOpenApiDocument>;

  constructor(private readonly env: EnvService) {}

  @Get('openapi.json')
  openapi() {
    this.document ??= buildOpenApiDocument({
      title: 'Portfolio API',
      version: '1.0.0',
      serverUrl: `${this.env.get('PUBLIC_API_URL')}/api/v1`,
    });
    return this.document;
  }

  /** Served from the API itself so the page CSP needs no inline script. */
  @Get('init.js')
  @Header('Content-Type', 'text/javascript; charset=utf-8')
  init() {
    return `window.ui = SwaggerUIBundle({ url: '${BASE}/openapi.json', dom_id: '#ui', deepLinking: true, persistAuthorization: false });`;
  }

  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header(
    'Content-Security-Policy',
    `default-src 'none'; script-src 'self' ${SWAGGER_UI}/; style-src ${SWAGGER_UI}/ 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'`,
  )
  ui() {
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Portfolio API</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="${SWAGGER_UI}/swagger-ui.css"></head>
<body><div id="ui"></div>
<script src="${SWAGGER_UI}/swagger-ui-bundle.js"></script>
<script src="${BASE}/init.js"></script>
</body></html>`;
  }
}
