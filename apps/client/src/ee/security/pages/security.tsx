import { Helmet } from "react-helmet-async";
import { getAppName, isCloud } from "@/lib/config.ts";
import SettingsTitle from "@/components/settings/settings-title.tsx";
import { Divider, Title } from "@mantine/core";
import React from "react";
import useUserRole from "@/hooks/use-user-role.tsx";
import SsoProviderList from "@/ee/security/components/sso-provider-list.tsx";
import EnforceSso from "@/ee/security/components/enforce-sso.tsx";
import AllowedDomains from "@/ee/security/components/allowed-domains.tsx";
import { useTranslation } from "react-i18next";
import EnforceMfa from "@/ee/security/components/enforce-mfa.tsx";
import DisablePublicSharing from "@/ee/security/components/disable-public-sharing.tsx";
import TrashRetention from "@/ee/security/components/trash-retention.tsx";

import { Feature, isHiddenFeature } from "@/ee/features";

function hasVisibleSsoProvider() {
  return [Feature.SSO_CUSTOM, Feature.SSO_GOOGLE].some(
    (feature) => !isHiddenFeature(feature),
  );
}

export default function Security() {
  const { t } = useTranslation();
  const { isAdmin } = useUserRole();
  const showMfa = !isHiddenFeature(Feature.MFA);
  const showRetention = !isHiddenFeature(Feature.RETENTION);
  const showSso = hasVisibleSsoProvider();

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Security - {getAppName()}</title>
      </Helmet>
      <SettingsTitle title={t("Security")} />

      {showMfa && (
        <>
          <EnforceMfa />
          <Divider my="lg" />
        </>
      )}

      <DisablePublicSharing />
      <Divider my="lg" />

      {showRetention && (
        <>
          <TrashRetention />
          <Divider my="lg" />
        </>
      )}

      {showSso && (
        <>
          <Title order={4} my="lg">
            Single sign-on (SSO)
          </Title>

          <EnforceSso />
          <Divider my="lg" />

          {isCloud() && (
            <>
              <AllowedDomains />
              <Divider my="lg" />
            </>
          )}

          <SsoProviderList />
        </>
      )}
    </>
  );
}
