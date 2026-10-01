/**
 * Base Use Case interface.
 * All use cases implement this for a uniform execution pattern.
 */
export interface IUseCase<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>
}
