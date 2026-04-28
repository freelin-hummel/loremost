import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { TemplateRepo } from '@docmost/db/repos/template/template.repo';
import { SpaceMemberRepo } from '@docmost/db/repos/space/space-member.repo';
import { PageRepo } from '@docmost/db/repos/page/page.repo';
import {
  Template,
  User,
  Workspace,
} from '@docmost/db/types/entity.types';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { jsonToText } from '../../collaboration/collaboration.util';
import { createYdocFromJson } from '../../common/helpers/prosemirror/utils';
import { UserRole } from '../../common/helpers/types/permission';
import {
  SpaceCaslAction,
  SpaceCaslSubject,
} from '../casl/interfaces/space-ability.type';
import SpaceAbilityFactory from '../casl/abilities/space-ability.factory';
import { PageAccessService } from '../page/page-access/page-access.service';
import { PageService } from '../page/services/page.service';
import {
  CreateTemplateDto,
  ListTemplatesDto,
  UpdateTemplateDto,
  UseTemplateDto,
} from './dto/template.dto';

@Injectable()
export class TemplateService {
  constructor(
    private readonly templateRepo: TemplateRepo,
    private readonly spaceMemberRepo: SpaceMemberRepo,
    private readonly pageRepo: PageRepo,
    private readonly spaceAbility: SpaceAbilityFactory,
    private readonly pageAccessService: PageAccessService,
    private readonly pageService: PageService,
    @InjectKysely() private readonly db: KyselyDB,
  ) {}

  async listTemplates(
    dto: ListTemplatesDto,
    user: User,
    workspace: Workspace,
  ) {
    const accessibleSpaceIds = await this.getAccessibleSpaceIds(
      user,
      workspace.id,
    );

    if (dto.spaceId && !accessibleSpaceIds.includes(dto.spaceId)) {
      throw new ForbiddenException();
    }

    return this.templateRepo.findTemplates(workspace.id, accessibleSpaceIds, dto, {
      spaceId: dto.spaceId,
    });
  }

  async getTemplate(templateId: string, user: User, workspaceId: string) {
    const template = await this.templateRepo.findById(templateId, workspaceId, {
      includeContent: true,
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    await this.validateCanViewTemplate(template, user, workspaceId);
    return template;
  }

  async createTemplate(
    dto: CreateTemplateDto,
    user: User,
    workspace: Workspace,
  ) {
    await this.validateCanCreateInScope(dto.spaceId ?? null, user, workspace);

    const content = dto.content ?? null;
    const inserted = await this.templateRepo.insertTemplate({
      title: dto.title.trim(),
      description: dto.description,
      icon: dto.icon,
      content,
      textContent: content ? jsonToText(content) : null,
      ydoc: content ? createYdocFromJson(content) : null,
      spaceId: dto.spaceId ?? null,
      workspaceId: workspace.id,
      creatorId: user.id,
      lastUpdatedById: user.id,
      collaboratorIds: [user.id],
    });

    return this.templateRepo.findById(inserted.id, workspace.id, {
      includeContent: true,
    });
  }

  async updateTemplate(
    dto: UpdateTemplateDto,
    user: User,
    workspace: Workspace,
  ) {
    const template = await this.templateRepo.findById(
      dto.templateId,
      workspace.id,
      { includeContent: true },
    );

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    await this.validateCanManageTemplate(template, user, workspace);

    if (dto.spaceId !== undefined && dto.spaceId !== template.spaceId) {
      await this.validateCanCreateInScope(dto.spaceId, user, workspace);
    }

    const update: Record<string, unknown> = {
      lastUpdatedById: user.id,
    };

    if (dto.title !== undefined) update.title = dto.title.trim();
    if (dto.description !== undefined) update.description = dto.description;
    if (dto.icon !== undefined) update.icon = dto.icon;
    if (dto.spaceId !== undefined) update.spaceId = dto.spaceId;

    if (dto.content !== undefined) {
      update.content = dto.content;
      update.textContent = dto.content ? jsonToText(dto.content) : null;
      update.ydoc = dto.content ? createYdocFromJson(dto.content) : null;
    }

    await this.templateRepo.updateTemplate(update, template.id, workspace.id);

    return this.templateRepo.findById(template.id, workspace.id, {
      includeContent: true,
    });
  }

  async deleteTemplate(templateId: string, user: User, workspace: Workspace) {
    const template = await this.templateRepo.findById(templateId, workspace.id);

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    await this.validateCanManageTemplate(template, user, workspace);
    await this.templateRepo.deleteTemplate(template.id, workspace.id);
  }

  async useTemplate(dto: UseTemplateDto, user: User, workspace: Workspace) {
    const template = await this.templateRepo.findById(
      dto.templateId,
      workspace.id,
      { includeContent: true },
    );

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    await this.validateCanViewTemplate(template, user, workspace.id);
    await this.validateCanCreatePage(dto, user);

    return this.pageService.create(user.id, workspace.id, {
      title: template.title ?? 'Untitled',
      icon: template.icon ?? undefined,
      spaceId: dto.spaceId,
      parentPageId: dto.parentPageId,
      content: template.content ?? undefined,
      format: template.content ? 'json' : undefined,
    });
  }

  private async validateCanCreatePage(dto: UseTemplateDto, user: User) {
    if (dto.parentPageId) {
      const parentPage = await this.pageRepo.findById(dto.parentPageId);
      if (
        !parentPage ||
        parentPage.deletedAt ||
        parentPage.spaceId !== dto.spaceId
      ) {
        throw new NotFoundException('Parent page not found');
      }

      await this.pageAccessService.validateCanEdit(parentPage, user);
      return;
    }

    const ability = await this.spaceAbility.createForUser(user, dto.spaceId);
    if (ability.cannot(SpaceCaslAction.Create, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }
  }

  private async validateCanViewTemplate(
    template: Template,
    user: User,
    workspaceId: string,
  ) {
    if (!template.spaceId) {
      return;
    }

    const accessibleSpaceIds = await this.getAccessibleSpaceIds(
      user,
      workspaceId,
    );
    if (!accessibleSpaceIds.includes(template.spaceId)) {
      throw new ForbiddenException();
    }
  }

  private async validateCanManageTemplate(
    template: Template,
    user: User,
    workspace: Workspace,
  ) {
    if (this.isWorkspaceAdmin(user)) {
      return;
    }

    if (
      !this.membersCanManageTemplates(workspace) ||
      template.creatorId !== user.id ||
      !template.spaceId
    ) {
      throw new ForbiddenException();
    }

    await this.validateCanManageSpaceTemplates(template.spaceId, user);
  }

  private async validateCanCreateInScope(
    spaceId: string | null,
    user: User,
    workspace: Workspace,
  ) {
    if (!spaceId) {
      if (this.isWorkspaceAdmin(user)) {
        return;
      }
      throw new ForbiddenException();
    }

    if (this.isWorkspaceAdmin(user)) {
      return;
    }

    if (!this.membersCanManageTemplates(workspace)) {
      throw new ForbiddenException();
    }

    await this.validateCanManageSpaceTemplates(spaceId, user);
  }

  private async validateCanManageSpaceTemplates(spaceId: string, user: User) {
    const ability = await this.spaceAbility.createForUser(user, spaceId);
    if (ability.cannot(SpaceCaslAction.Manage, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }
  }

  private async getAccessibleSpaceIds(user: User, workspaceId: string) {
    if (this.isWorkspaceAdmin(user)) {
      const spaces = await this.db
        .selectFrom('spaces')
        .select('id')
        .where('workspaceId', '=', workspaceId)
        .where('deletedAt', 'is', null)
        .execute();
      return spaces.map((space) => space.id);
    }

    return this.spaceMemberRepo.getUserSpaceIds(user.id);
  }

  private isWorkspaceAdmin(user: User) {
    return user.role === UserRole.OWNER || user.role === UserRole.ADMIN;
  }

  private membersCanManageTemplates(workspace: Workspace) {
    return (
      (workspace.settings as Record<string, any>)?.templates
        ?.allowMemberTemplates === true
    );
  }
}
