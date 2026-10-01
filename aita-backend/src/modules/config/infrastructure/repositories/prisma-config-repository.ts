import { IConfigRepository } from '../../domain/repositories/config-repository.interface.js'
import { ProjectType } from '../../domain/entities/project-type.entity.js'
import { PromptTemplate } from '../../domain/entities/prompt-template.entity.js'

export class PrismaConfigRepository implements IConfigRepository {
    constructor(private readonly prisma: any) { }

    async listProjectTypes(): Promise<ProjectType[]> {
        const list = await (this.prisma as any).projectType.findMany()
        return list.map((l: any) => ProjectType.restore(l.Id, l.Code, l.DisplayName, l.RequiresSandbox, l.SandboxImage, l.BuildCommand, l.RunCommand))
    }

    async getProjectType(code: string): Promise<ProjectType | null> {
        const pt = await (this.prisma as any).projectType.findUnique({ where: { Code: code } })
        if (!pt) return null
        return ProjectType.restore(pt.Id, pt.Code, pt.DisplayName, pt.RequiresSandbox, pt.SandboxImage, pt.BuildCommand, pt.RunCommand)
    }

    async saveProjectType(pt: ProjectType): Promise<void> {
        await (this.prisma as any).projectType.upsert({
            where: { Id: pt.id },
            create: {
                Id: pt.id,
                Code: pt.code,
                DisplayName: pt.displayName,
                RequiresSandbox: pt.requiresSandbox,
                SandboxImage: pt.sandboxImage,
                BuildCommand: pt.buildCommand,
                RunCommand: pt.runCommand
            },
            update: {
                DisplayName: pt.displayName,
                RequiresSandbox: pt.requiresSandbox,
                SandboxImage: pt.sandboxImage,
                BuildCommand: pt.buildCommand,
                RunCommand: pt.runCommand
            }
        })
    }

    async listPromptTemplates(): Promise<PromptTemplate[]> {
        const list = await (this.prisma as any).promptTemplate.findMany()
        return list.map((l: any) => (PromptTemplate as any).restore(l))
    }

    async getPromptTemplate(code: string): Promise<PromptTemplate | null> {
        const pt = await (this.prisma as any).promptTemplate.findUnique({ where: { Code: code } })
        if (!pt) return null
        return (PromptTemplate as any).restore(pt)
    }

    async savePromptTemplate(pt: PromptTemplate): Promise<void> {
        await (this.prisma as any).promptTemplate.upsert({
            where: { Id: pt.id },
            create: { /* mapping */ },
            update: { /* mapping */ }
        })
    }
}
