import { Body, Controller, Get, Header, HttpCode, HttpStatus, Param, Post, Query, Req, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import {
  contactRequestSchema,
  ContactRequest,
  LocaleQuery,
  localeQuerySchema,
  PublicProjectsQuery,
  publicProjectsQuerySchema,
  slugSchema,
} from '@portfolio/contracts';
import type { Request } from 'express';
import { ContactService } from '../../../application/contact.service';
import { SiteService } from '../../../application/site.service';
import { EnvService } from '../../../infrastructure/config/env.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { hashIp } from '../support/request-meta';
import { validate } from '../support/zod-validation.pipe';

/** Short shared cache: the website caches pages itself and revalidates on publish. */
const CACHE = 'public, max-age=60, s-maxage=60, stale-while-revalidate=300';

@Controller()
export class PublicController {
  constructor(
    private readonly site: SiteService,
    private readonly contactService: ContactService,
    private readonly env: EnvService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('health')
  @SkipThrottle()
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'up', timestamp: new Date().toISOString() };
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
  }

  @Get('site')
  @Header('Cache-Control', CACHE)
  getSite(@Query(validate(localeQuerySchema)) { locale }: LocaleQuery) {
    return this.site.getSite(locale);
  }

  @Get('profile')
  @Header('Cache-Control', CACHE)
  getProfile(@Query(validate(localeQuerySchema)) { locale }: LocaleQuery) {
    return this.site.getProfile(locale);
  }

  @Get('projects')
  @Header('Cache-Control', CACHE)
  listProjects(@Query(validate(publicProjectsQuerySchema)) query: PublicProjectsQuery) {
    return this.site.listProjects(query);
  }

  @Get('projects/:slug')
  @Header('Cache-Control', CACHE)
  getProject(
    @Param('slug', validate(slugSchema)) slug: string,
    @Query(validate(localeQuerySchema)) { locale }: LocaleQuery,
  ) {
    return this.site.getProject(slug, locale);
  }

  @Get('sitemap')
  @Header('Cache-Control', CACHE)
  sitemap() {
    return this.site.sitemap();
  }

  /** Always answers the same way for accepted and silently dropped (spam) submissions. */
  @Post('contact')
  @HttpCode(HttpStatus.ACCEPTED)
  async contact(@Body(validate(contactRequestSchema)) body: ContactRequest, @Req() request: Request) {
    await this.contactService.send(body, hashIp(request, this.env.get('IP_HASH_SALT')));
    return { ok: true as const };
  }
}
