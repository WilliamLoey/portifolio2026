import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards } from '@nestjs/common';
import {
  CategoryInput,
  categoryInputSchema,
  CertificationInput,
  certificationInputSchema,
  idSchema,
  ReorderBody,
  reorderSchema,
  SocialLinkInput,
  socialLinkInputSchema,
  TechnologyInput,
  technologyInputSchema,
} from '@portfolio/contracts';
import {
  CategoriesService,
  CertificationsService,
  SocialLinksService,
  TechnologiesService,
} from '../../../application/career.services';
import { SessionGuard } from '../support/session.guard';
import { validate } from '../support/zod-validation.pipe';

const id = validate(idSchema);
const reorder = validate(reorderSchema);

/** Technologies, categories, certifications and social links. Changes apply immediately. */
@UseGuards(SessionGuard)
@Controller('admin')
export class AdminReferenceController {
  constructor(
    private readonly technologies: TechnologiesService,
    private readonly categories: CategoriesService,
    private readonly certifications: CertificationsService,
    private readonly socialLinks: SocialLinksService,
  ) {}

  /* Technologies */
  @Get('technologies') listTechnologies() { return this.technologies.list(); }
  @Put('technologies/order') @HttpCode(HttpStatus.NO_CONTENT)
  async reorderTechnologies(@Body(reorder) b: ReorderBody) { await this.technologies.reorder(b.ids); }
  @Post('technologies')
  createTechnology(@Body(validate(technologyInputSchema)) b: TechnologyInput) { return this.technologies.create(b); }
  @Put('technologies/:id')
  updateTechnology(@Param('id', id) i: string, @Body(validate(technologyInputSchema)) b: TechnologyInput) { return this.technologies.update(i, b); }
  @Delete('technologies/:id') @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTechnology(@Param('id', id) i: string) { await this.technologies.delete(i); }

  /* Categories */
  @Get('categories') listCategories() { return this.categories.list(); }
  @Post('categories')
  createCategory(@Body(validate(categoryInputSchema)) b: CategoryInput) { return this.categories.create(b); }
  @Put('categories/:id')
  updateCategory(@Param('id', id) i: string, @Body(validate(categoryInputSchema)) b: CategoryInput) { return this.categories.update(i, b); }
  @Delete('categories/:id') @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCategory(@Param('id', id) i: string) { await this.categories.delete(i); }

  /* Certifications */
  @Get('certifications') listCertifications() { return this.certifications.list(); }
  @Put('certifications/order') @HttpCode(HttpStatus.NO_CONTENT)
  async reorderCertifications(@Body(reorder) b: ReorderBody) { await this.certifications.reorder(b.ids); }
  @Post('certifications')
  createCertification(@Body(validate(certificationInputSchema)) b: CertificationInput) { return this.certifications.create(b); }
  @Put('certifications/:id')
  updateCertification(@Param('id', id) i: string, @Body(validate(certificationInputSchema)) b: CertificationInput) { return this.certifications.update(i, b); }
  @Delete('certifications/:id') @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCertification(@Param('id', id) i: string) { await this.certifications.delete(i); }

  /* Social links */
  @Get('social-links') listSocialLinks() { return this.socialLinks.list(); }
  @Put('social-links/order') @HttpCode(HttpStatus.NO_CONTENT)
  async reorderSocialLinks(@Body(reorder) b: ReorderBody) { await this.socialLinks.reorder(b.ids); }
  @Post('social-links')
  createSocialLink(@Body(validate(socialLinkInputSchema)) b: SocialLinkInput) { return this.socialLinks.create(b); }
  @Put('social-links/:id')
  updateSocialLink(@Param('id', id) i: string, @Body(validate(socialLinkInputSchema)) b: SocialLinkInput) { return this.socialLinks.update(i, b); }
  @Delete('social-links/:id') @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSocialLink(@Param('id', id) i: string) { await this.socialLinks.delete(i); }
}
