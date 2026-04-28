import React from "react";
import { MfaSettings } from "@/ee/mfa";
import { Feature, isHiddenFeature } from "@/ee/features";

export function AccountMfaSection() {
  if (isHiddenFeature(Feature.MFA)) {
    return null;
  }

  return <MfaSettings />;
}
