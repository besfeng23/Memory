import type { FirstLiveAppendEmergencyStopState } from "@/lib/services/first-live-append-readiness-lock-contract";

export type FirstLiveAppendEmergencyStopInput = {
  runtimeEmergencyStopEnabled?: boolean;
  operatorEmergencyStop?: boolean;
  emergencyStateProvider?:
    | (() => Promise<{ enabled: boolean; reason?: string } | boolean>)
    | { enabled: boolean; reason?: string }
    | boolean;
};

const toSafeEmergencyStopState = (
  enabled: boolean,
  source: FirstLiveAppendEmergencyStopState["source"],
  reason?: string,
): FirstLiveAppendEmergencyStopState => ({
  enabled,
  source,
  redacted: true,
  reason: reason ? "redacted" : undefined,
});

export async function evaluateFirstLiveAppendEmergencyStop(
  input: FirstLiveAppendEmergencyStopInput = {},
): Promise<FirstLiveAppendEmergencyStopState> {
  if (input.runtimeEmergencyStopEnabled) {
    return toSafeEmergencyStopState(true, "runtime_config", "runtime");
  }

  if (input.operatorEmergencyStop) {
    return toSafeEmergencyStopState(true, "operator_flag", "operator");
  }

  const providerValue =
    typeof input.emergencyStateProvider === "function"
      ? await input.emergencyStateProvider()
      : input.emergencyStateProvider;
  const providerEnabled = typeof providerValue === "boolean" ? providerValue : Boolean(providerValue?.enabled);

  if (providerEnabled) {
    return toSafeEmergencyStopState(
      true,
      "provider",
      typeof providerValue === "object" ? providerValue.reason : "provider",
    );
  }

  return toSafeEmergencyStopState(false, "off");
}

export async function assertFirstLiveAppendEmergencyStopIsOff(
  input: FirstLiveAppendEmergencyStopInput = {},
): Promise<FirstLiveAppendEmergencyStopState> {
  const state = await evaluateFirstLiveAppendEmergencyStop(input);
  if (state.enabled) {
    throw new Error("first_live_append_emergency_stop_enabled");
  }
  return state;
}
