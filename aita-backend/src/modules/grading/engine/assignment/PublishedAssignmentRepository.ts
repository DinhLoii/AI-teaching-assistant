// @ts-nocheck
import { PublishedAssignment } from '../core/domain/submission/PublishedAssignment';
import { prisma } from '../../../../database/prisma.js';

export class PublishedAssignmentRepository {
    constructor(private readonly db: any = prisma) {}

    public async saveAsync(assignment: PublishedAssignment): Promise<void> {
        const dataStr = JSON.stringify(assignment);
        const versionStr = assignment.version !== undefined && assignment.version !== null 
            ? String(assignment.version) 
            : '1';
        await this.db.publishedAssignment.upsert({
            where: { Id: assignment.id },
            update: {
                Version: versionStr,
                Title: assignment.metadata?.title,
                Description: assignment.metadata?.description,
                ProjectType: assignment.metadata?.projectType,
                BlueprintId: assignment.blueprintId,
                Data: dataStr,
            },
            create: {
                Id: assignment.id,
                Version: versionStr,
                Title: assignment.metadata?.title,
                Description: assignment.metadata?.description,
                ProjectType: assignment.metadata?.projectType,
                BlueprintId: assignment.blueprintId,
                Data: dataStr,
            }
        });
        console.log(`[PublishedAssignmentRepository] Saved assignment ${assignment.id} to DB.`);
    }

    public async getAsync(id: string): Promise<PublishedAssignment | undefined> {
        const row = await this.db.publishedAssignment.findUnique({ where: { Id: id } });
        if (row && row.Data) {
            return JSON.parse(row.Data) as PublishedAssignment;
        }
        return undefined;
    }
    
    public async getLatestAsync(): Promise<PublishedAssignment | undefined> {
        const row = await this.db.publishedAssignment.findFirst({
            orderBy: { CreatedAt: 'desc' }
        });
        if (row && row.Data) {
            return JSON.parse(row.Data) as PublishedAssignment;
        }
        return undefined;
    }

    public async getAllAsync(): Promise<PublishedAssignment[]> {
        const rows = await this.db.publishedAssignment.findMany({
            where: { OR: [{ IsDeleted: false }, { IsDeleted: null }] },
            orderBy: { CreatedAt: 'desc' }
        });
        return rows.map(r => JSON.parse(r.Data!) as PublishedAssignment);
    }

    public async getTrashAsync(): Promise<PublishedAssignment[]> {
        const rows = await this.db.publishedAssignment.findMany({
            where: { IsDeleted: true },
            orderBy: { DeletedAt: 'desc' }
        });
        return rows.map(r => {
            const data = JSON.parse(r.Data!) as PublishedAssignment;
            return {
                ...data,
                deletedAt: r.DeletedAt
            };
        });
    }

    public async softDeleteAsync(id: string): Promise<boolean> {
        try {
            await this.db.publishedAssignment.update({
                where: { Id: id },
                data: {
                    IsDeleted: true,
                    DeletedAt: new Date()
                }
            });
            console.log(`[PublishedAssignmentRepository] Soft-deleted assignment ${id} in DB.`);
            return true;
        } catch (error) {
            console.error(`[PublishedAssignmentRepository] Error soft deleting ${id}:`, error);
            return false;
        }
    }

    public async restoreAsync(id: string): Promise<boolean> {
        try {
            await this.db.publishedAssignment.update({
                where: { Id: id },
                data: {
                    IsDeleted: false,
                    DeletedAt: null
                }
            });
            console.log(`[PublishedAssignmentRepository] Restored assignment ${id} in DB.`);
            return true;
        } catch (error) {
            console.error(`[PublishedAssignmentRepository] Error restoring ${id}:`, error);
            return false;
        }
    }

    public async deleteAsync(id: string): Promise<boolean> {
        try {
            await this.db.publishedAssignment.delete({ where: { Id: id } });
            console.log(`[PublishedAssignmentRepository] Deleted assignment ${id} from DB.`);
            return true;
        } catch (error) {
            return false;
        }
    }
}

export const globalAssignmentRepository = new PublishedAssignmentRepository();

