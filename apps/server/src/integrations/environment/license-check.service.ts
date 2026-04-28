import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { EnvironmentService } from './environment.service';
import { Feature } from '../../common/features';

const builtInFeatures = new Set<string>([
  Feature.API_KEYS,
  Feature.COMMENT_RESOLUTION,
  Feature.PAGE_PERMISSIONS,
  Feature.AI,
  Feature.ATTACHMENT_INDEXING,
  Feature.MCP,
  Feature.SCIM,
  Feature.PAGE_VERIFICATION,
  Feature.AUDIT_LOGS,
  Feature.SHARING_CONTROLS,
  Feature.TEMPLATES,
  Feature.VIEWER_COMMENTS,
]);

const hiddenFeatures = new Set<string>([
  Feature.SSO_CUSTOM,
  Feature.SSO_GOOGLE,
  Feature.MFA,
  Feature.CONFLUENCE_IMPORT,
  Feature.DOCX_IMPORT,
  Feature.SECURITY_SETTINGS,
  Feature.RETENTION,
  Feature.PDF_EXPORT,
]);

@Injectable()
export class LicenseCheckService {
  constructor(
    private moduleRef: ModuleRef,
    private environmentService: EnvironmentService,
  ) {}

  isValidEELicense(licenseKey: string): boolean {
    if (this.environmentService.isCloud()) {
      return true;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const LicenseModule = require('../../ee/licence/license.service');
      const licenseService = this.moduleRef.get(LicenseModule.LicenseService, {
        strict: false,
      });
      return licenseService.isValidEELicense(licenseKey);
    } catch {
      return false;
    }
  }

  hasFeature(licenseKey: string, feature: string, plan?: string): boolean {
    if (hiddenFeatures.has(feature)) {
      return false;
    }

    if (builtInFeatures.has(feature)) {
      return true;
    }

    if (this.environmentService.isCloud()) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { getFeaturesForCloudPlan } = require('../../ee/licence/feature-registry');
        return getFeaturesForCloudPlan(plan).has(feature);
      } catch {
        return false;
      }
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const LicenseModule = require('../../ee/licence/license.service');
      const licenseService = this.moduleRef.get(LicenseModule.LicenseService, {
        strict: false,
      });
      return licenseService.hasFeature(licenseKey, feature);
    } catch {
      return false;
    }
  }

  getFeatures(licenseKey: string): string[] {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const LicenseModule = require('../../ee/licence/license.service');
      const licenseService = this.moduleRef.get(LicenseModule.LicenseService, {
        strict: false,
      });
      return licenseService.getFeatures(licenseKey);
    } catch {
      return [];
    }
  }

  resolveFeatures(licenseKey: string, plan: string): string[] {
    const visibleFeatures = (features: string[]) =>
      [...new Set([...features, ...builtInFeatures])].filter(
        (feature) => !hiddenFeatures.has(feature),
      );

    if (this.environmentService.isCloud()) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { getFeaturesForCloudPlan } = require('../../ee/licence/feature-registry');
        return visibleFeatures([...getFeaturesForCloudPlan(plan)]);
      } catch {
        return visibleFeatures([]);
      }
    }

    return visibleFeatures(this.getFeatures(licenseKey));
  }

  resolveTier(licenseKey: string, plan: string): string {
    if (this.environmentService.isCloud()) {
      return plan ?? 'standard';
    }

    return this.getLicenseType(licenseKey) ?? 'free';
  }

  private getLicenseType(licenseKey: string): string | null {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const LicenseModule = require('../../ee/licence/license.service');
      const licenseService = this.moduleRef.get(LicenseModule.LicenseService, {
        strict: false,
      });
      return licenseService.getLicenseType(licenseKey);
    } catch {
      return null;
    }
  }
}
