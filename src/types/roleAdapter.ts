import { RoleCode } from './enums';

export const WIRE_ROLE_TO_ROLE_CODE: Readonly<Record<string, RoleCode>> = Object.freeze({
  OPERATOR: RoleCode.DRONE_OPERATOR,
  CREW: RoleCode.REPAIR_CREW,
  REPORTER: RoleCode.REPORTER,
  SUPERVISOR: RoleCode.SUPERVISOR,
  PM: RoleCode.PROJECT_MANAGER,
});

export const ROLE_CODE_TO_WIRE_ROLE: Readonly<Record<RoleCode, string>> = Object.freeze({
  [RoleCode.DRONE_OPERATOR]: 'OPERATOR',
  [RoleCode.REPAIR_CREW]: 'CREW',
  [RoleCode.REPORTER]: 'REPORTER',
  [RoleCode.SUPERVISOR]: 'SUPERVISOR',
  [RoleCode.PROJECT_MANAGER]: 'PM',
});

export function toInternalRole(wire: unknown): RoleCode | null {
  if (typeof wire !== 'string') {
    return null;
  }
  const key = wire.trim().toUpperCase();
  return WIRE_ROLE_TO_ROLE_CODE[key] ?? null;
}

/**
 * `GET /profile` (`ProfileResponseDto.RoleCode`) trả mã lưu DB của BE
 * (`UserRoleCodeExtensions.ToDbCode`), KHÁC dialect actor V2 mà `/auth/login` dùng.
 * Chuẩn hoá về `RoleCode`; mã lạ ⇒ `null` (fail closed, không đoán vai trò).
 */
export const PROFILE_ROLE_TO_ROLE_CODE: Readonly<Record<string, RoleCode>> = Object.freeze({
  SUPERVISOR: RoleCode.SUPERVISOR,
  PM: RoleCode.PROJECT_MANAGER,
  DRONE_OPERATOR: RoleCode.DRONE_OPERATOR,
  REPAIR_CREW: RoleCode.REPAIR_CREW,
  REPORTER: RoleCode.REPORTER,
});

export function mapProfileRole(wire: unknown): RoleCode | null {
  if (typeof wire !== 'string') {
    return null;
  }
  const key = wire.trim().toUpperCase();
  return PROFILE_ROLE_TO_ROLE_CODE[key] ?? WIRE_ROLE_TO_ROLE_CODE[key] ?? null;
}

export function toWireRole(role: RoleCode | null | undefined): string | null {
  if (!role) {
    return null;
  }
  return ROLE_CODE_TO_WIRE_ROLE[role] ?? null;
}

export function isMobileRole(role: RoleCode | null | undefined): boolean {
  return (
    role === RoleCode.DRONE_OPERATOR ||
    role === RoleCode.REPAIR_CREW ||
    role === RoleCode.REPORTER
  );
}
