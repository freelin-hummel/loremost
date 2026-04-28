import { useAtom } from "jotai";
import { entitlementAtom } from "@/ee/entitlement/entitlement-atom";
import { isFeatureAvailable } from "@/ee/features";

export const useHasFeature = (feature: string): boolean => {
  const [entitlements] = useAtom(entitlementAtom);
  return isFeatureAvailable(feature, entitlements?.features);
};
