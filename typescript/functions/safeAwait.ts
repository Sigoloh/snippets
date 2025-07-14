import { Maybe } from "../types/Maybe.type";


// Makes promises return error as values in the form of a tuple ALWAYS in the form of (value, error). Everything is go if you try hard enough
export async function safeAwait<T extends Awaited<ReturnType<Fn>>, Fn extends (...args: Parameters<Fn>) => ReturnType<Fn>>(
  thisArg: Maybe<any>,
  fn: Fn,
  ...params: Parameters<Fn>
): Promise<[Maybe<T>, Maybe<Error>]> {
  try {

    const fnResult = await fn.bind(thisArg)(...params);

    return [fnResult as T, undefined]

  } catch (error) {

    return [undefined, (error as Error)]    

  }
}
