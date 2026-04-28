import { Module } from '@nestjs/common';
import { TemplateController } from './template.controller';
import { TemplateService } from './template.service';
import { CaslModule } from '../casl/casl.module';
import { PageModule } from '../page/page.module';
import { PageAccessModule } from '../page/page-access/page-access.module';

@Module({
  imports: [CaslModule, PageModule, PageAccessModule],
  controllers: [TemplateController],
  providers: [TemplateService],
})
export class TemplateModule {}
