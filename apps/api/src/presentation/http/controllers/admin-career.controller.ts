import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards } from '@nestjs/common';
import {
  EducationInput,
  educationInputSchema,
  ExperienceInput,
  experienceInputSchema,
  idSchema,
} from '@portfolio/contracts';
import { compareEducation, compareExperience } from '../../../application/localize';
import { EducationService, ExperienceService } from '../../../application/career.services';
import { presentEducation, presentExperience } from '../support/presenters';
import { SessionGuard } from '../support/session.guard';
import { validate } from '../support/zod-validation.pipe';

const id = validate(idSchema);

@UseGuards(SessionGuard)
@Controller('admin')
export class AdminCareerController {
  constructor(
    private readonly experience: ExperienceService,
    private readonly education: EducationService,
  ) {}

  @Get('experience')
  async listExperience() {
    const items = await this.experience.list();
    return items.sort((a, b) => compareExperience(a.draft, b.draft)).map(presentExperience);
  }

  @Post('experience')
  async createExperience(@Body(validate(experienceInputSchema)) body: ExperienceInput) {
    return presentExperience(await this.experience.create(body));
  }

  @Put('experience/:id')
  async updateExperience(@Param('id', id) itemId: string, @Body(validate(experienceInputSchema)) body: ExperienceInput) {
    return presentExperience(await this.experience.update(itemId, body));
  }

  @Post('experience/:id/publish')
  @HttpCode(HttpStatus.OK)
  async publishExperience(@Param('id', id) itemId: string) {
    return presentExperience(await this.experience.publish(itemId));
  }

  @Post('experience/:id/unpublish')
  @HttpCode(HttpStatus.OK)
  async unpublishExperience(@Param('id', id) itemId: string) {
    return presentExperience(await this.experience.unpublish(itemId));
  }

  @Delete('experience/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteExperience(@Param('id', id) itemId: string): Promise<void> {
    await this.experience.delete(itemId);
  }

  @Get('education')
  async listEducation() {
    const items = await this.education.list();
    return items.sort((a, b) => compareEducation(a.draft, b.draft)).map(presentEducation);
  }

  @Post('education')
  async createEducation(@Body(validate(educationInputSchema)) body: EducationInput) {
    return presentEducation(await this.education.create(body));
  }

  @Put('education/:id')
  async updateEducation(@Param('id', id) itemId: string, @Body(validate(educationInputSchema)) body: EducationInput) {
    return presentEducation(await this.education.update(itemId, body));
  }

  @Post('education/:id/publish')
  @HttpCode(HttpStatus.OK)
  async publishEducation(@Param('id', id) itemId: string) {
    return presentEducation(await this.education.publish(itemId));
  }

  @Post('education/:id/unpublish')
  @HttpCode(HttpStatus.OK)
  async unpublishEducation(@Param('id', id) itemId: string) {
    return presentEducation(await this.education.unpublish(itemId));
  }

  @Delete('education/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEducation(@Param('id', id) itemId: string): Promise<void> {
    await this.education.delete(itemId);
  }
}
