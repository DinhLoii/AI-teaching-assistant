import { ProjectType } from '../entities/project-type.entity.js'
import { PromptTemplate } from '../entities/prompt-template.entity.js'

export interface IConfigRepository {
    listProjectTypes(): Promise<ProjectType[]>
    getProjectType(code: string): Promise<ProjectType | null>
    saveProjectType(projectType: ProjectType): Promise<void>

    listPromptTemplates(): Promise<PromptTemplate[]>
    getPromptTemplate(code: string): Promise<PromptTemplate | null>
    savePromptTemplate(template: PromptTemplate): Promise<void>
}
