import { PrismaClient, Prisma } from '@prisma/client'
import { prisma } from '../../database/prisma.js'
import type { IUnitOfWork } from '../application/ports/unit-of-work.interface.js'
import { Logger } from './logger.js'

/**
 * Prisma-backed Unit of Work.
 *
 * Repositories are registered by their symbol token.
 * Inside a transaction, a child UoW is created with new repo instances
 * that share the transactional Prisma client.
 */
export class PrismaUnitOfWork implements IUnitOfWork {
  private readonly client: PrismaClient | Prisma.TransactionClient
  private readonly repositories = new Map<symbol, unknown>()
  private readonly repoFactories = new Map<symbol, (client: any) => unknown>()
  private readonly logger: Logger

  constructor(client: PrismaClient | Prisma.TransactionClient = prisma) {
    this.client = client
    this.logger = new Logger('UnitOfWork')
  }

  /**
   * Register a repository factory for a given token.
   * The factory receives the Prisma client and returns a repo instance.
   */
  registerFactory<T>(token: symbol, factory: (client: any) => T): void {
    this.repoFactories.set(token, factory)
  }

  /**
   * Resolve a repository by its token.
   * Lazily instantiates and caches the repo on first access.
   */
  resolve<T>(token: symbol): T {
    if (!this.repositories.has(token)) {
      const factory = this.repoFactories.get(token)
      if (!factory) {
        throw new Error(`No repository factory registered for token: ${token.toString()}`)
      }
      this.repositories.set(token, factory(this.client))
    }
    return this.repositories.get(token) as T
  }

  /**
   * LEGACY: Resolve a repository by its class constructor.
   */
  getRepo<T>(RepoClass: new (client: any) => T): T {
    const className = RepoClass.name
    // Use string key for legacy repos to avoid polluting the token map
    const legacyToken = Symbol.for(className)
    
    if (!this.repositories.has(legacyToken)) {
      this.repositories.set(legacyToken, new RepoClass(this.client))
    }
    return this.repositories.get(legacyToken) as T
  }

  async runInTransaction<T>(work: (txUow: IUnitOfWork) => Promise<T>): Promise<T> {
    if (this.isTransactionClient(this.client)) {
      this.logger.debug('Reusing existing transaction')
      return work(this)
    }

    this.logger.debug('Starting new transaction')
    const timeout = Number(process.env.DB_TRANSACTION_TIMEOUT) || 10000

    try {
      const result = await (this.client as PrismaClient).$transaction(
        async (tx) => {
          // Create a child UoW sharing the transactional client
          const txUow = new PrismaUnitOfWork(tx)
          // Copy all registered factories to the transactional UoW
          for (const [token, factory] of this.repoFactories) {
            txUow.registerFactory(token, factory)
          }
          return work(txUow)
        },
        { timeout },
      )
      this.logger.debug('Transaction committed successfully')
      return result
    } catch (error) {
      this.logger.error('Transaction rolled back due to error', error as Error)
      throw error
    }
  }

  /** Expose the underlying client for infrastructure-level access (e.g., DI container setup) */
  getClient(): PrismaClient | Prisma.TransactionClient {
    return this.client
  }

  private isTransactionClient(client: PrismaClient | Prisma.TransactionClient): boolean {
    return !('$transaction' in client) || typeof (client as any).$transaction !== 'function'
  }
}
