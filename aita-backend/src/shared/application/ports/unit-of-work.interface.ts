/**
 * Unit of Work interface — provides transactional scope.
 *
 * Repositories are injected directly into use cases via DI.
 * UoW is ONLY used when a use case needs to run multiple
 * repository operations within a single database transaction.
 */
export interface IUnitOfWork {
  /**
   * Run a set of operations within a database transaction.
   * The callback receives a transactional UoW whose repositories
   * share the same underlying transaction client.
   * If any operation fails, the entire transaction is rolled back.
   */
  runInTransaction<T>(work: (txUow: IUnitOfWork) => Promise<T>): Promise<T>

  /**
   * Resolve a repository instance from this UoW context.
   * Inside a transaction, the returned repo uses the transactional client.
   * @param token - unique symbol identifying the repository
   */
  resolve<T>(token: symbol): T

  /**
   * Get the underlying database client (e.g. PrismaClient).
   * Note: This is an implementation detail and should ideally be avoided in domain logic, 
   * but it's used in some legacy or query-heavy use-cases.
   */
  getClient(): any
}
