import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  idSchema,
  markReadSchema,
  MessagesQuery,
  messagesQuerySchema,
  UpdateMediaBody,
  updateMediaSchema,
} from '@portfolio/contracts';
import { ContactService } from '../../../application/contact.service';
import { MediaService } from '../../../application/media.service';
import { presentMedia, presentMessage } from '../support/presenters';
import { SessionGuard } from '../support/session.guard';
import { validate } from '../support/zod-validation.pipe';

const id = validate(idSchema);

/** Hard cap at the HTTP layer; MediaService enforces the configurable MAX_UPLOAD_MB and the real type. */
const upload = FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024, files: 1, fields: 0 } });

function requireFile(file?: Express.Multer.File): Buffer {
  if (!file) throw new BadRequestException('Send the image as multipart/form-data in the "file" field');
  return file.buffer;
}

@UseGuards(SessionGuard)
@Controller('admin')
export class AdminMediaController {
  constructor(
    private readonly media: MediaService,
    private readonly contact: ContactService,
  ) {}

  @Get('media')
  async list() {
    return (await this.media.list()).map(presentMedia);
  }

  @Post('media')
  @UseInterceptors(upload)
  async upload(@UploadedFile() file?: Express.Multer.File) {
    return presentMedia(await this.media.upload(requireFile(file)));
  }

  @Put('media/:id/file')
  @UseInterceptors(upload)
  async replace(@Param('id', id) mediaId: string, @UploadedFile() file?: Express.Multer.File) {
    return presentMedia(await this.media.replace(mediaId, requireFile(file)));
  }

  @Patch('media/:id')
  async updateAlt(@Param('id', id) mediaId: string, @Body(validate(updateMediaSchema)) body: UpdateMediaBody) {
    return presentMedia(await this.media.updateAlt(mediaId, body.alt));
  }

  @Delete('media/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', id) mediaId: string): Promise<void> {
    await this.media.delete(mediaId);
  }

  /* Contact messages */

  @Get('messages')
  async messages(@Query(validate(messagesQuerySchema)) query: MessagesQuery) {
    const page = await this.contact.page(query);
    return { ...page, items: page.items.map(presentMessage) };
  }

  @Patch('messages/:id')
  async markRead(@Param('id', id) messageId: string, @Body(validate(markReadSchema)) body: { read: boolean }) {
    return presentMessage(await this.contact.markRead(messageId, body.read));
  }

  @Delete('messages/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMessage(@Param('id', id) messageId: string): Promise<void> {
    await this.contact.delete(messageId);
  }
}
