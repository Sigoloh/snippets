// Makes properties K optional in T
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
