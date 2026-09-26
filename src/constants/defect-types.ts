export const DEFECT_TYPE_CODES = {
  POTH_DEEP: 'POTH_DEEP',
  DEPR_POND: 'DEPR_POND',
  EDGE_BRK: 'EDGE_BRK',
  SLAB_CRK: 'SLAB_CRK',
  SHLD_EROS: 'SHLD_EROS',
} as const;

export type DefectTypeCode = (typeof DEFECT_TYPE_CODES)[keyof typeof DEFECT_TYPE_CODES];

export const DEFECT_TYPE_LABELS: Record<DefectTypeCode, string> = {
  [DEFECT_TYPE_CODES.POTH_DEEP]: 'Ổ gà sâu',
  [DEFECT_TYPE_CODES.DEPR_POND]: 'Lún võng nước đọng',
  [DEFECT_TYPE_CODES.EDGE_BRK]: 'Vỡ mép tấm',
  [DEFECT_TYPE_CODES.SLAB_CRK]: 'Nứt tấm bê tông',
  [DEFECT_TYPE_CODES.SHLD_EROS]: 'Xói lở vai đường',
};

export const DEFECT_TYPE_OPTIONS = (
  Object.keys(DEFECT_TYPE_LABELS) as DefectTypeCode[]
).map((code) => ({ code, label: DEFECT_TYPE_LABELS[code] }));

export function defectTypeLabel(code: string): string {
  return DEFECT_TYPE_LABELS[code as DefectTypeCode] ?? code;
}
