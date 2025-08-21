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