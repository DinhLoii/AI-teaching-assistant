// @ts-nocheck
import { IDatabaseProvisioner, DatabaseProvisionResult } from '../../core/contracts/IDatabaseProvisioner';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

export class PostgresProvisioner implements IDatabaseProvisioner {
    private containers: Map<string, StartedPostgreSqlContainer> = new Map();

    public async provisionDatabaseAsync(config: any): Promise<DatabaseProvisionResult> {
        console.log(`[PostgresProvisioner] Starting PostgreSQL container via testcontainers...`);
        try {
            const container = await new PostgreSqlContainer("postgres:15-alpine")
                .withDatabase("grading_db")
                .withUsername("postgres")
                .withPassword("postgres")
                .start();

            const connectionString = container.getConnectionUri();
            const containerId = container.getId();
            
            this.containers.set(containerId, container);

            return {
                success: true,
                connectionString,
                instanceId: containerId
            };
        } catch (error) {
            console.error('[PostgresProvisioner] Failed to provision database:', error);
            return {
                success: false,
                connectionString: '',
                instanceId: '',
                error: (error as Error).message
            };
        }
    }

    public async destroyDatabaseAsync(instanceId: string): Promise<void> {
        const container = this.containers.get(instanceId);
        if (container) {
            console.log(`[PostgresProvisioner] Destroying database container ${instanceId}...`);
            try {
                await container.stop();
            } catch (error) {
                console.error(`[PostgresProvisioner] Failed to cleanly stop container ${instanceId}:`, error);
            } finally {
                // Always remove reference to prevent double-stops and memory leaks
                this.containers.delete(instanceId);
            }
        }
    }
}

