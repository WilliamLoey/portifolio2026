import { z } from 'zod';
import { overviewSchema, coverageSchema } from './admin';
import { changePasswordSchema, loginResponseSchema, loginSchema, sessionSchema } from './auth';
import {
  adminEducationSchema,
  adminExperienceSchema,
  certificationInputSchema,
  certificationSchema,
  educationInputSchema,
  experienceInputSchema,
  socialLinkInputSchema,
  socialLinkSchema,
} from './career';
import { apiErrorSchema, localeQuerySchema, paginatedSchema, reorderSchema } from './common';
import {
  contactMessageSchema,
  contactRequestSchema,
  contactResponseSchema,
  markReadSchema,
  messagesQuerySchema,
} from './contact';
import { mediaAssetSchema, updateMediaSchema } from './media';
import { adminProfileSchema, publicProfileSchema, setPhotoSchema, updateProfileSchema } from './profile';
import {
  adminProjectSchema,
  projectFlagsSchema,
  projectInputSchema,
  publicProjectSchema,
  publicProjectSummarySchema,
  publicProjectsQuerySchema,
} from './projects';
import { sitemapEntrySchema, sitePayloadSchema } from './site';
import { categoryInputSchema, categorySchema, technologyInputSchema, technologySchema } from './taxonomy';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RouteDef {
  method: HttpMethod;
  /** Express-style path relative to /api/v1, e.g. "/admin/projects/:id". */
  path: string;
  tag: string;
  summary: string;
  auth: boolean;
  query?: z.ZodType;
  body?: z.ZodType;
  /** multipart/form-data field holding a file. */
  file?: string;
  response?: z.ZodType;
  status?: number;
}

const r = <T extends RouteDef>(def: T) => def;

/**
 * Every endpoint of the API. The NestJS controllers implement these, the OpenAPI
 * document is generated from them, and the web client uses the same schemas.
 */
export const routes = {
  /* Public */
  health: r({ method: 'GET', path: '/health', tag: 'Public', summary: 'Liveness and database check', auth: false }),
  site: r({
    method: 'GET', path: '/site', tag: 'Public', auth: false, query: localeQuerySchema, response: sitePayloadSchema,
    summary: 'Profile, featured projects, experience, education and stack for one language',
  }),
  profile: r({
    method: 'GET', path: '/profile', tag: 'Public', auth: false, query: localeQuerySchema,
    response: publicProfileSchema, summary: 'Published profile',
  }),
  projects: r({
    method: 'GET', path: '/projects', tag: 'Public', auth: false, query: publicProjectsQuerySchema,
    response: paginatedSchema(publicProjectSummarySchema), summary: 'Published projects, paginated',
  }),
  project: r({
    method: 'GET', path: '/projects/:slug', tag: 'Public', auth: false, query: localeQuerySchema,
    response: publicProjectSchema, summary: 'One published project',
  }),
  sitemap: r({
    method: 'GET', path: '/sitemap', tag: 'Public', auth: false, response: z.array(sitemapEntrySchema),
    summary: 'Published project slugs for sitemap.xml',
  }),
  contact: r({
    method: 'POST', path: '/contact', tag: 'Public', auth: false, body: contactRequestSchema,
    response: contactResponseSchema, status: 202, summary: 'Send a message (3 per 10 minutes per IP)',
  }),

  /* Auth */
  login: r({
    method: 'POST', path: '/auth/login', tag: 'Auth', auth: false, body: loginSchema,
    response: loginResponseSchema, summary: 'Start a session (5 attempts per minute)',
  }),
  logout: r({ method: 'POST', path: '/auth/logout', tag: 'Auth', auth: true, status: 204, summary: 'End this session' }),
  me: r({ method: 'GET', path: '/auth/me', tag: 'Auth', auth: true, response: sessionSchema, summary: 'Current session' }),
  changePassword: r({
    method: 'POST', path: '/auth/password', tag: 'Auth', auth: true, body: changePasswordSchema, status: 204,
    summary: 'Change password and sign out every other session',
  }),

  /* Admin: overview */
  overview: r({ method: 'GET', path: '/admin/overview', tag: 'Admin', auth: true, response: overviewSchema, summary: 'Dashboard statistics' }),
  coverage: r({ method: 'GET', path: '/admin/translations', tag: 'Admin', auth: true, response: coverageSchema, summary: 'Which languages each item is written in' }),

  /* Admin: profile */
  adminProfile: r({ method: 'GET', path: '/admin/profile', tag: 'Profile', auth: true, response: adminProfileSchema, summary: 'Working copy of the profile' }),
  updateProfile: r({ method: 'PUT', path: '/admin/profile', tag: 'Profile', auth: true, body: updateProfileSchema, response: adminProfileSchema, summary: 'Save profile draft' }),
  setProfilePhoto: r({ method: 'PUT', path: '/admin/profile/photo', tag: 'Profile', auth: true, body: setPhotoSchema, response: adminProfileSchema, summary: 'Choose the profile photo' }),
  publishProfile: r({ method: 'POST', path: '/admin/profile/publish', tag: 'Profile', auth: true, response: adminProfileSchema, summary: 'Publish the profile' }),
  previewProfile: r({ method: 'GET', path: '/admin/preview/profile', tag: 'Profile', auth: true, query: localeQuerySchema, response: publicProfileSchema, summary: 'Profile draft rendered as visitors would get it' }),

  /* Admin: projects */
  adminProjects: r({ method: 'GET', path: '/admin/projects', tag: 'Projects', auth: true, response: z.array(adminProjectSchema), summary: 'All projects in display order' }),
  adminProject: r({ method: 'GET', path: '/admin/projects/:id', tag: 'Projects', auth: true, response: adminProjectSchema, summary: 'One project' }),
  createProject: r({ method: 'POST', path: '/admin/projects', tag: 'Projects', auth: true, body: projectInputSchema, response: adminProjectSchema, status: 201, summary: 'Create a draft project' }),
  updateProject: r({ method: 'PUT', path: '/admin/projects/:id', tag: 'Projects', auth: true, body: projectInputSchema, response: adminProjectSchema, summary: 'Save project draft' }),
  projectFlags: r({ method: 'PATCH', path: '/admin/projects/:id/flags', tag: 'Projects', auth: true, body: projectFlagsSchema, response: adminProjectSchema, summary: 'Toggle featured / home visibility (applies immediately)' }),
  publishProject: r({ method: 'POST', path: '/admin/projects/:id/publish', tag: 'Projects', auth: true, response: adminProjectSchema, summary: 'Publish the current draft' }),
  unpublishProject: r({ method: 'POST', path: '/admin/projects/:id/unpublish', tag: 'Projects', auth: true, response: adminProjectSchema, summary: 'Hide from visitors' }),
  reorderProjects: r({ method: 'PUT', path: '/admin/projects/order', tag: 'Projects', auth: true, body: reorderSchema, status: 204, summary: 'Set display order' }),
  deleteProject: r({ method: 'DELETE', path: '/admin/projects/:id', tag: 'Projects', auth: true, status: 204, summary: 'Delete a project' }),
  previewProject: r({ method: 'GET', path: '/admin/preview/projects/:id', tag: 'Projects', auth: true, query: localeQuerySchema, response: publicProjectSchema, summary: 'Project draft rendered as visitors would get it' }),

  /* Admin: experience & education */
  adminExperience: r({ method: 'GET', path: '/admin/experience', tag: 'Career', auth: true, response: z.array(adminExperienceSchema), summary: 'All experience entries, current first, then by start date' }),
  createExperience: r({ method: 'POST', path: '/admin/experience', tag: 'Career', auth: true, body: experienceInputSchema, response: adminExperienceSchema, status: 201, summary: 'Create a draft entry' }),
  updateExperience: r({ method: 'PUT', path: '/admin/experience/:id', tag: 'Career', auth: true, body: experienceInputSchema, response: adminExperienceSchema, summary: 'Save draft' }),
  publishExperience: r({ method: 'POST', path: '/admin/experience/:id/publish', tag: 'Career', auth: true, response: adminExperienceSchema, summary: 'Publish' }),
  unpublishExperience: r({ method: 'POST', path: '/admin/experience/:id/unpublish', tag: 'Career', auth: true, response: adminExperienceSchema, summary: 'Unpublish' }),
  deleteExperience: r({ method: 'DELETE', path: '/admin/experience/:id', tag: 'Career', auth: true, status: 204, summary: 'Delete' }),

  adminEducation: r({ method: 'GET', path: '/admin/education', tag: 'Career', auth: true, response: z.array(adminEducationSchema), summary: 'All education entries, newest first' }),
  createEducation: r({ method: 'POST', path: '/admin/education', tag: 'Career', auth: true, body: educationInputSchema, response: adminEducationSchema, status: 201, summary: 'Create a draft entry' }),
  updateEducation: r({ method: 'PUT', path: '/admin/education/:id', tag: 'Career', auth: true, body: educationInputSchema, response: adminEducationSchema, summary: 'Save draft' }),
  publishEducation: r({ method: 'POST', path: '/admin/education/:id/publish', tag: 'Career', auth: true, response: adminEducationSchema, summary: 'Publish' }),
  unpublishEducation: r({ method: 'POST', path: '/admin/education/:id/unpublish', tag: 'Career', auth: true, response: adminEducationSchema, summary: 'Unpublish' }),
  deleteEducation: r({ method: 'DELETE', path: '/admin/education/:id', tag: 'Career', auth: true, status: 204, summary: 'Delete' }),

  /* Admin: reference data (applies immediately, no draft) */
  technologies: r({ method: 'GET', path: '/admin/technologies', tag: 'Reference data', auth: true, response: z.array(technologySchema), summary: 'Technologies / skills' }),
  createTechnology: r({ method: 'POST', path: '/admin/technologies', tag: 'Reference data', auth: true, body: technologyInputSchema, response: technologySchema, status: 201, summary: 'Add a technology' }),
  updateTechnology: r({ method: 'PUT', path: '/admin/technologies/:id', tag: 'Reference data', auth: true, body: technologyInputSchema, response: technologySchema, summary: 'Edit a technology' }),
  reorderTechnologies: r({ method: 'PUT', path: '/admin/technologies/order', tag: 'Reference data', auth: true, body: reorderSchema, status: 204, summary: 'Set display order' }),
  deleteTechnology: r({ method: 'DELETE', path: '/admin/technologies/:id', tag: 'Reference data', auth: true, status: 204, summary: 'Delete (also removes it from projects)' }),

  categories: r({ method: 'GET', path: '/admin/categories', tag: 'Reference data', auth: true, response: z.array(categorySchema), summary: 'Project categories' }),
  createCategory: r({ method: 'POST', path: '/admin/categories', tag: 'Reference data', auth: true, body: categoryInputSchema, response: categorySchema, status: 201, summary: 'Add a category' }),
  updateCategory: r({ method: 'PUT', path: '/admin/categories/:id', tag: 'Reference data', auth: true, body: categoryInputSchema, response: categorySchema, summary: 'Edit a category' }),
  deleteCategory: r({ method: 'DELETE', path: '/admin/categories/:id', tag: 'Reference data', auth: true, status: 204, summary: 'Delete (projects become uncategorised)' }),

  certifications: r({ method: 'GET', path: '/admin/certifications', tag: 'Reference data', auth: true, response: z.array(certificationSchema), summary: 'Certifications' }),
  createCertification: r({ method: 'POST', path: '/admin/certifications', tag: 'Reference data', auth: true, body: certificationInputSchema, response: certificationSchema, status: 201, summary: 'Add a certification' }),
  updateCertification: r({ method: 'PUT', path: '/admin/certifications/:id', tag: 'Reference data', auth: true, body: certificationInputSchema, response: certificationSchema, summary: 'Edit a certification' }),
  reorderCertifications: r({ method: 'PUT', path: '/admin/certifications/order', tag: 'Reference data', auth: true, body: reorderSchema, status: 204, summary: 'Set display order' }),
  deleteCertification: r({ method: 'DELETE', path: '/admin/certifications/:id', tag: 'Reference data', auth: true, status: 204, summary: 'Delete' }),

  socialLinks: r({ method: 'GET', path: '/admin/social-links', tag: 'Reference data', auth: true, response: z.array(socialLinkSchema), summary: 'Social links' }),
  createSocialLink: r({ method: 'POST', path: '/admin/social-links', tag: 'Reference data', auth: true, body: socialLinkInputSchema, response: socialLinkSchema, status: 201, summary: 'Add a link' }),
  updateSocialLink: r({ method: 'PUT', path: '/admin/social-links/:id', tag: 'Reference data', auth: true, body: socialLinkInputSchema, response: socialLinkSchema, summary: 'Edit a link' }),
  reorderSocialLinks: r({ method: 'PUT', path: '/admin/social-links/order', tag: 'Reference data', auth: true, body: reorderSchema, status: 204, summary: 'Set display order' }),
  deleteSocialLink: r({ method: 'DELETE', path: '/admin/social-links/:id', tag: 'Reference data', auth: true, status: 204, summary: 'Delete' }),

  /* Admin: media */
  media: r({ method: 'GET', path: '/admin/media', tag: 'Media', auth: true, response: z.array(mediaAssetSchema), summary: 'Image library' }),
  uploadMedia: r({ method: 'POST', path: '/admin/media', tag: 'Media', auth: true, file: 'file', response: mediaAssetSchema, status: 201, summary: 'Upload an image (JPEG, PNG, WebP, AVIF, GIF; max 4 MB)' }),
  updateMedia: r({ method: 'PATCH', path: '/admin/media/:id', tag: 'Media', auth: true, body: updateMediaSchema, response: mediaAssetSchema, summary: 'Edit alt text' }),
  replaceMedia: r({ method: 'PUT', path: '/admin/media/:id/file', tag: 'Media', auth: true, file: 'file', response: mediaAssetSchema, summary: 'Replace the file; every page using it updates' }),
  deleteMedia: r({ method: 'DELETE', path: '/admin/media/:id', tag: 'Media', auth: true, status: 204, summary: 'Delete an unused image' }),

  /* Admin: messages */
  messages: r({ method: 'GET', path: '/admin/messages', tag: 'Messages', auth: true, query: messagesQuerySchema, response: paginatedSchema(contactMessageSchema), summary: 'Contact messages, newest first' }),
  markMessage: r({ method: 'PATCH', path: '/admin/messages/:id', tag: 'Messages', auth: true, body: markReadSchema, response: contactMessageSchema, summary: 'Mark read / unread' }),
  deleteMessage: r({ method: 'DELETE', path: '/admin/messages/:id', tag: 'Messages', auth: true, status: 204, summary: 'Delete a message' }),
} as const satisfies Record<string, RouteDef>;

export type RouteName = keyof typeof routes;

/* ── OpenAPI 3.1 document generated from the registry ── */

function jsonSchema(schema: z.ZodType, io: 'input' | 'output') {
  return z.toJSONSchema(schema, { io, unrepresentable: 'any', target: 'draft-2020-12' });
}

export function buildOpenApiDocument(info: { title: string; version: string; serverUrl: string }) {
  const paths: Record<string, Record<string, unknown>> = {};
  const errorResponse = { content: { 'application/json': { schema: jsonSchema(apiErrorSchema, 'output') } } };

  for (const [name, route] of Object.entries(routes) as [string, RouteDef][]) {
    const path = route.path.replace(/:(\w+)/g, '{$1}');
    const params = [...route.path.matchAll(/:(\w+)/g)].map((m) => ({
      name: m[1], in: 'path', required: true, schema: { type: 'string' },
    }));

    if (route.query) {
      const qs = jsonSchema(route.query, 'input') as { properties?: Record<string, unknown> };
      for (const [key, schema] of Object.entries(qs.properties ?? {})) {
        params.push({ name: key, in: 'query', required: false, schema: schema as { type: string } });
      }
    }

    const status = String(route.status ?? 200);
    const operation: Record<string, unknown> = {
      operationId: name,
      tags: [route.tag],
      summary: route.summary,
      parameters: params,
      responses: {
        [status]: route.response
          ? { description: 'Success', content: { 'application/json': { schema: jsonSchema(route.response, 'output') } } }
          : { description: 'Success' },
        ...(route.body || route.query ? { 400: { description: 'Validation failed', ...errorResponse } } : {}),
        ...(route.auth ? { 401: { description: 'Not signed in', ...errorResponse } } : {}),
        ...(route.path.includes(':') ? { 404: { description: 'Not found', ...errorResponse } } : {}),
      },
    };
    if (route.auth) operation.security = [{ session: [] }];
    if (route.body) {
      operation.requestBody = { required: true, content: { 'application/json': { schema: jsonSchema(route.body, 'input') } } };
    }
    if (route.file) {
      operation.requestBody = {
        required: true,
        content: {
          'multipart/form-data': {
            schema: { type: 'object', required: [route.file], properties: { [route.file]: { type: 'string', format: 'binary' } } },
          },
        },
      };
    }
    paths[path] = { ...paths[path], [route.method.toLowerCase()]: operation };
  }

  return {
    openapi: '3.1.0',
    info: {
      title: info.title,
      version: info.version,
      description:
        'REST API behind williamvanloey portfolio. Public endpoints serve published content only; ' +
        '/admin endpoints require a session token obtained from POST /auth/login.',
    },
    servers: [{ url: info.serverUrl }],
    components: { securitySchemes: { session: { type: 'http', scheme: 'bearer', description: 'Opaque session token' } } },
    paths,
  };
}
