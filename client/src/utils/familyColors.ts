// Family member color assignments for consistent UI
export const FAMILY_MEMBER_COLORS = [
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#06B6D4', // cyan-500
  '#84CC16', // lime-500
  '#F97316', // orange-500
  '#14B8A6', // teal-500
];

export const getUserColor = (userId: number, allUserIds: number[]) => {
  const sortedUserIds = allUserIds.sort();
  const index = sortedUserIds.indexOf(userId);
  return FAMILY_MEMBER_COLORS[index % FAMILY_MEMBER_COLORS.length];
};
