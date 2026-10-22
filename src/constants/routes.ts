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
export const REPORTER_CAPTURE = '/(reporter)/capture';
export const REPORTER_UPLOADS = '/(reporter)/uploads';
export const REPORTER_REPORT_SUPPLEMENT = '/(reporter)/report-supplement';
export const REPORTER_ACCOUNT = '/(reporter)/account';
export const REPORTER_TRACK = '/(reporter)/track';
export const REPORTER_FEEDBACK = '/(reporter)/feedback';
export const REPORTER_PROFILE = '/(reporter)/profile';
export const AUTH_OTP_VERIFY = '/(auth)/otp-verify';
export const AUTH_REGISTER = '/(auth)/register';
export const AUTH_FORCE_CHANGE_PASSWORD = '/(auth)/force-change-password';

export const CREW_HOME = '/(crew)/home';
export const CREW_TASKS = '/(crew)/tasks';
export const CREW_WO_DETAIL = '/(crew)/wo-detail';
export const CREW_REPAIR_CORRECTION = '/(crew)/repair-correction';
export const CREW_FIELD_REVIEW = '/(crew)/field-review';
export const CREW_RECEIVING = '/(crew)/receiving';

export const DRONE_HOME = '/(drone)/home';
export const DRONE_REQUESTS = '/(drone)/requests';
export const DRONE_REQUEST_DETAIL = '/(drone)/request-detail';
export const DRONE_REQUEST_DECLINE = '/(drone)/request-decline';
export const DRONE_WORK_PACKAGE = '/(drone)/work-package';
export const DRONE_LOG = '/(drone)/log';
export const DRONE_SYNC = '/(drone)/sync';
export const DRONE_UPLOAD = '/(drone)/upload';
export const DRONE_PROFILE = '/(drone)/profile';
