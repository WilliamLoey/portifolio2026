import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import {
  AdminProject,
  idSchema,
  LocaleQuery,
  localeQuerySchema,
  ProjectFlagsBody,
  projectFlagsSchema,
  ProjectInput,
  projectInputSchema,
  ReorderBody,
  reorderSchema,
  SetPhotoBody,
  setPhotoSchema,
  UpdateProfileBody,
  updateProfileSchema,
} from '@portfolio/contracts';
import { DashboardService } from '../../../application/dashboard.service';
import { ProfileService } from '../../../application/profile.service';
import { ProjectsService } from '../../../application/projects.service';
import { SiteService } from '../../../application/site.service';
import { ProfileRecord, ProjectRecord } from '../../../domain/content';
import { NotFoundError } from '../../../domain/errors';
import { MediaRepository } from '../../../domain/ports';
import { presentProfile, presentProject } from '../support/presenters';
import { SessionGuard } from '../support/session.guard';
import { validate } from '../support/zod-validation.pipe';

const id = validate(idSchema);

@UseGuards(SessionGuard)
@Controller('admin')
export class AdminContentController {
  constructor(
    private readonly projects: ProjectsService,
    private readonly profile: ProfileService,
    private readonly dashboard: DashboardService,
    private readonly site: SiteService,
    private readonly media: MediaRepository,
  ) {}

  /* Overview */

  @Get('overview')
  overview() {
    return this.dashboard.overview();
  }

  @Get('translations')
  async translations() {
    return { rows: await this.dashboard.coverage() };
  }

  /* Profile */

  @Get('profile')
  async getProfile() {
    return this.presentProfile(await this.profile.getOrFail());
  }

  @Put('profile')
  async saveProfile(@Body(validate(updateProfileSchema)) body: UpdateProfileBody) {
    return this.presentProfile(await this.profile.save(body));
  }

  @Put('profile/photo')
  async setPhoto(@Body(validate(setPhotoSchema)) body: SetPhotoBody) {
    return this.presentProfile(await this.profile.setPhoto(body.mediaId));
  }

  @Post('profile/publish')
  @HttpCode(HttpStatus.OK)
  async publishProfile() {
    return this.presentProfile(await this.profile.publish());
  }

  @Get('preview/profile')
  previewProfile(@Query(validate(localeQuerySchema)) { locale }: LocaleQuery) {
    return this.profile.preview(locale);
  }

  /* Projects — static segments ("order") are declared before ":id". */

  @Get('projects')
  async listProjects(): Promise<AdminProject[]> {
    return this.presentProjects(await this.projects.list());
  }

  @Put('projects/order')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reorderProjects(@Body(validate(reorderSchema)) body: ReorderBody): Promise<void> {
    await this.projects.reorder(body.ids);
  }

  @Get('projects/:id')
  async getProject(@Param('id', id) projectId: string) {
    return this.presentOne(await this.projects.get(projectId));
  }

  @Post('projects')
  async createProject(@Body(validate(projectInputSchema)) body: ProjectInput) {
    return this.presentOne(await this.projects.create(body));
  }

  @Put('projects/:id')
  async updateProject(@Param('id', id) projectId: string, @Body(validate(projectInputSchema)) body: ProjectInput) {
    return this.presentOne(await this.projects.update(projectId, body));
  }

  @Patch('projects/:id/flags')
  async setFlags(@Param('id', id) projectId: string, @Body(validate(projectFlagsSchema)) body: ProjectFlagsBody) {
    return this.presentOne(await this.projects.setFlags(projectId, body));
  }

  @Post('projects/:id/publish')
  @HttpCode(HttpStatus.OK)
  async publishProject(@Param('id', id) projectId: string) {
    return this.presentOne(await this.projects.publish(projectId));
  }

  @Post('projects/:id/unpublish')
  @HttpCode(HttpStatus.OK)
  async unpublishProject(@Param('id', id) projectId: string) {
    return this.presentOne(await this.projects.unpublish(projectId));
  }

  @Delete('projects/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProject(@Param('id', id) projectId: string): Promise<void> {
    await this.projects.delete(projectId);
  }

  @Get('preview/projects/:id')
  async previewProject(@Param('id', id) projectId: string, @Query(validate(localeQuerySchema)) { locale }: LocaleQuery) {
    return this.site.previewProject(await this.projects.get(projectId), locale);
  }

  private async presentProjects(items: ProjectRecord[]) {
    const coverIds = items.map((p) => p.draft.coverId).filter((v): v is string => Boolean(v));
    const media = new Map((await this.media.findManyByIds(coverIds)).map((m) => [m.id, m]));
    return items.map((p) => presentProject(p, media));
  }

  private async presentOne(item: ProjectRecord) {
    const [presented] = await this.presentProjects([item]);
    if (!presented) throw new NotFoundError('Project not found');
    return presented;
  }

  private async presentProfile(record: ProfileRecord) {
    const photo = record.draft.photoId ? await this.media.findById(record.draft.photoId) : null;
    return presentProfile(record, photo ?? undefined);
  }
}
