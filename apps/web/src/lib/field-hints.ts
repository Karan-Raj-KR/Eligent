// Static DOM-selector hints per profile field, for the Chrome extension to try
// when matching a scholarship form's inputs. Hand-maintained, not derived from data.
export const FIELD_HINTS: Record<string, string[]> = {
  full_name: ["input[name*=name]", "input[id*=name]", "input[autocomplete=name]"],
  cgpa: ["input[name*=cgpa]", "input[name*=gpa]", "input[id*=cgpa]"],
  percentage: ["input[name*=percentage]", "input[name*=percent]", "input[id*=percentage]"],
  year_of_study: ["select[name*=year]", "input[name*=year]", "select[id*=year]"],
  branch: ["select[name*=branch]", "input[name*=branch]", "select[name*=stream]", "input[name*=department]"],
  state: ["select[name*=state]", "input[name*=state]"],
  annual_family_income: ["input[name*=income]", "input[id*=income]"],
  institution_type: ["select[name*=institution]", "input[name*=institution]", "select[name*=college_type]"],
  category: ["select[name*=category]", "input[name*=category]", "select[name*=caste]"],
  gender: ["select[name*=gender]", "input[name*=gender]"],
};
