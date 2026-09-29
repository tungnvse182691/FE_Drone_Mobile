import { RoleCode } from '../types/enums';

export const ROLE_HOMES: Partial<Record<RoleCode, string>> = {
  [RoleCode.DRONE_OPERATOR]: '/(drone)/home',
  [RoleCode.REPAIR_CREW]: '/(crew)/home',
  [RoleCode.REPORTER]: '/(reporter)/home',
};

export const ROLE_GROUPS: Partial<Record<RoleCode, string>> = {
  [RoleCode.DRONE_OPERATOR]: '(drone)',
  [RoleCode.REPAIR_CREW]: '(crew)',
  [RoleCode.REPORTER]: '(reporter)',
};

export const WEB_ONLY_ROLE_MESSAGE =
  'Tài khoản Quản lý vui lòng đăng nhập trên RoadGuard Web Dashboard';

/** Nhóm route công khai: người dân không có tài khoản nên không qua AuthGuard. */
export const PUBLIC_ROUTE_GROUP = '(reporter)';

export const REPORTER_HOME = '/(reporter)/home';
export const REPORTER_REPORT = '/(reporter)/report';
export const REPORTER_TRACK = '/(reporter)/track';
export const REPORTER_FEEDBACK = '/(reporter)/feedback';
export const REPORTER_PROFILE = '/(reporter)/profile';
export const AUTH_OTP_VERIFY = '/(auth)/otp-verify';
