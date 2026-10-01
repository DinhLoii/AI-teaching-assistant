// @ts-nocheck
import { DocumentExtractor } from './DocumentExtractor';
import { RequirementParserService } from './RequirementParserService';
import { BlueprintService } from './BlueprintService';
import { RubricGeneratorService } from './RubricGeneratorService';
import { TestSuiteGeneratorService } from './TestSuiteGeneratorService';
import { PublishedAssignmentRepository } from './PublishedAssignmentRepository';
import { PublishedAssignment } from '../core/domain/submission/PublishedAssignment';
import { v4 as uuidv4 } from 'uuid';

export class AssignmentManagementService {
    constructor(
        private extractor: DocumentExtractor,
        private parser: RequirementParserService,
        private blueprintService: BlueprintService,
        private rubricGenerator: RubricGeneratorService,
        private testSuiteGenerator: TestSuiteGeneratorService,
        private repository: PublishedAssignmentRepository
    ) {}

    /**
     * Executes the end-to-end flow from document upload to publishing the assignment.
     */
    public async createAssignmentFromDocumentAsync(fileBuffer: Buffer, mimeType: string): Promise<PublishedAssignment> {
        // 1. Extract Text
        const extracted = await this.extractor.extractAsync(fileBuffer, mimeType);
        
        // 2. Parse Requirements (AI)
        const draft = await this.parser.parseRequirementsAsync(extracted.rawText);
        await this.blueprintService.saveDraftAsync(draft);
        
        // 3. Publish Blueprint (Mocking instructor approval)
        const publishedBlueprint = await this.blueprintService.publishAsync(draft.id);
        
        // 4. Generate Rubric & Tests
        const rubric = await this.rubricGenerator.generateRubricAsync(publishedBlueprint);
        const testSuites = await this.testSuiteGenerator.generateTestSuitesAsync(publishedBlueprint);
        
        // 5. Construct Final PublishedAssignment
        const assignment: PublishedAssignment = {
            id: uuidv4(),
            version: publishedBlueprint.version,
            blueprintId: publishedBlueprint.id,
            metadata: {
                title: publishedBlueprint.assignmentTitle,
                description: publishedBlueprint.description,
                projectType: publishedBlueprint.projectType
            },
            rubric,
            testSuites
        };

        await this.repository.saveAsync(assignment);
        return assignment;
    }
}

