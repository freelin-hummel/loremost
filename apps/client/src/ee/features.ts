export const Feature = {
  SSO_CUSTOM: 'sso:custom',
  SSO_GOOGLE: 'sso:google',
  MFA: 'mfa',
  API_KEYS: 'api:keys',
  COMMENT_RESOLUTION: 'comment:resolution',
  PAGE_PERMISSIONS: 'page:permissions',
  AI: 'ai',
  CONFLUENCE_IMPORT: 'import:confluence',
  DOCX_IMPORT: 'import:docx',
  ATTACHMENT_INDEXING: 'attachment:indexing',
  SECURITY_SETTINGS: 'security:settings',
  MCP: 'mcp',
  SCIM: 'scim',
  PAGE_VERIFICATION: 'page:verification',
  AUDIT_LOGS: 'audit:logs',
  RETENTION: 'retention',
  SHARING_CONTROLS: 'sharing:controls',
  TEMPLATES: 'templates',
  VIEWER_COMMENTS: 'comment:viewer',
} as const;

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
]);

export function isBuiltInFeature(feature: string): boolean {
  return builtInFeatures.has(feature);
}

export function isHiddenFeature(feature: string): boolean {
  return hiddenFeatures.has(feature);
}

export function isFeatureAvailable(feature: string, features: string[] = []): boolean {
  if (isHiddenFeature(feature)) {
    return false;
  }

  return isBuiltInFeature(feature) || features.includes(feature);
}
