// Simple templates utility for project portal
export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  tasks: Array<{
    id: string;
    name: string;
    estimatedDuration: number;
    dependencies?: string[];
  }>;
}

export class TemplatesService {
  static async getProjectTemplates(): Promise<ProjectTemplate[]> {
    // Placeholder implementation
    return [
      {
        id: 'standard_installation',
        name: 'Standard Heat Pump Installation',
        description: 'Standard residential heat pump installation project',
        tasks: [
          {
            id: 'site_survey',
            name: 'Site Survey',
            estimatedDuration: 2
          },
          {
            id: 'installation',
            name: 'Equipment Installation',
            estimatedDuration: 8,
            dependencies: ['site_survey']
          }
        ]
      }
    ];
  }

  static async getTemplate(templateId: string): Promise<ProjectTemplate | null> {
    const templates = await this.getProjectTemplates();
    return templates.find(t => t.id === templateId) || null;
  }

  static async createProject(templateId: string, projectData: any): Promise<string> {
    // Placeholder implementation
    return 'new-project-id';
  }
}

export default TemplatesService;

// Export individual functions for direct use
export function selectOptimalTemplate(criteria: any) {
  // Placeholder implementation
  return Promise.resolve({
    templateId: 'standard_installation',
    reason: 'Best match for project requirements'
  })
}

export function applyConditionalModifications(templateId: string, projectData: any) {
  // Placeholder implementation
  return Promise.resolve({
    modifiedTemplate: templateId,
    modifications: ['adjusted_timeline', 'custom_requirements']
  })
}

export function suggestTeamAssignment(templateId: string, requirements: any) {
  // Placeholder implementation
  return Promise.resolve({
    recommendedTeam: ['lead_technician', 'assistant'],
    skillsRequired: ['heat_pump_installation', 'electrical']
  })
}