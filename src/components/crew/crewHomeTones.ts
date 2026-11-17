/** Display only. These colors/icons never decide eligibility or available actions. */
export function crewHomeModeTone(mode: string) {
  if (mode === 'CONDITIONAL_FT' || mode === 'INSPECT_AND_REPAIR') {
    return { background: '#DDF5EC', foreground: '#115E47', border: '#83CEB2', icon: 'build' as const };
  }
  if (mode === 'MEASURE_ONLY' || mode === 'INSPECT_ONLY') {
    return { background: '#E3EFFF', foreground: '#174EA6', border: '#93B9ED', icon: 'straighten' as const };
  }
  if (mode === 'NORMAL') {
    return { background: '#E7EAF0', foreground: '#334155', border: '#9AA9BF', icon: 'event-note' as const };
  }
  return { background: '#F1F3F5', foreground: '#424B57', border: '#C3CAD3', icon: 'help-outline' as const };
}
