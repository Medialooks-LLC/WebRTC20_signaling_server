// `extends object`: required by TypeScript >= 4.8 for the `in` operator on a generic.
export const hasKey = <O extends object>(obj: O, key: keyof any): key is keyof O => {
  return key in obj;
};
