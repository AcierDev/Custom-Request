import { toast as sonnerToast } from "sonner";

export const PALETTE_ROUTE_PATH = "/palette";
const PALETTE_ROUTE_PREFIX = `${PALETTE_ROUTE_PATH}/`;
const SUPPRESSED_SUCCESS_TOAST_ID = "palette-success-toast-suppressed";

export const shouldSuppressSuccessToast = (
  pathname: string | null | undefined,
): boolean =>
  pathname === PALETTE_ROUTE_PATH ||
  pathname?.startsWith(PALETTE_ROUTE_PREFIX) === true;

const getCurrentPathname = (): string | undefined =>
  typeof window === "undefined" ? undefined : window.location.pathname;

const routeAwareSuccess: typeof sonnerToast.success = (message, data) => {
  if (shouldSuppressSuccessToast(getCurrentPathname())) {
    return SUPPRESSED_SUCCESS_TOAST_ID;
  }

  return sonnerToast.success(message, data);
};

const baseToast = (
  message: Parameters<typeof sonnerToast>[0],
  data?: Parameters<typeof sonnerToast>[1],
) => sonnerToast(message, data);

export const toast = Object.assign(baseToast, sonnerToast, {
  success: routeAwareSuccess,
}) as typeof sonnerToast;
