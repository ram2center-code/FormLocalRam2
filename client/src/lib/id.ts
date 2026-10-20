export const generateId = (prefix = ''): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 10);
  const randomStr2 = Math.random().toString(36).substring(2, 6);
  return `${prefix ? prefix + '_' : ''}${timestamp}${randomStr}${randomStr2}`;
};
