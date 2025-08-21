'use client';

import { useState, useEffect } from 'react';
import { ProjectCreateRequest, ProjectTemplate, ApiResponse } from '@/types';

interface TemplateListResponse {
  templates: ProjectTemplate[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

interface TemplateSelectionResponse {
  selected_template: ProjectTemplate & { confidence_score: number };
  template_modifications: any;
  team_suggestion: any;
  criteria_used: any;
}

const equipmentCategories = [
  { value: 'heat_pump', label: 'Heat Pump System' },
  { value: 'mini_split', label: 'Mini Split System' },
  { value: 'water_heater', label: 'Heat Pump Water Heater' },
  { value: 'ductwork', label: 'Ductwork Installation' },
  { value: 'service', label: 'Service & Repair' },
  { value: 'maintenance', label: 'Maintenance' },
];

const propertyTypes = [
  { value: 'single_family', label: 'Single Family Home' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'condo', label: 'Condominium' },
  { value: 'multi_family', label: 'Multi-family' },
  { value: 'commercial', label: 'Commercial' },
];

const ductworkConditions = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
];

export default function CreateProjectPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Form data
  const [projectMethod, setProjectMethod] = useState<'template' | 'manual'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [autoRecommendation, setAutoRecommendation] = useState<TemplateSelectionResponse | null>(null);
  
  // Project criteria
  const [criteria, setCriteria] = useState({
    equipment_category: '',
    property_type: '',
    home_age: '',
    square_footage: '',
    electrical_adequate: true,
    ductwork_condition: 'good' as const,
    complexity_factors: [] as string[],
    special_requirements: [] as string[],
    budget_range: { min: 0, max: 0 },
  });
  
  // Project details
  const [projectDetails, setProjectDetails] = useState({
    planned_start_date: '',
    customer_preferences: {} as Record<string, any>,
    site_conditions: {} as Record<string, any>,
    team_preferences: {} as Record<string, any>,
  });

  useEffect(() => {
    if (step === 2 && projectMethod === 'template') {
      fetchTemplates();
    }
  }, [step, projectMethod]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/templates?active_only=true&per_page=50`);
      const data: ApiResponse<TemplateListResponse> = await response.json();
      
      if (data.success && data.data) {
        setTemplates(data.data.templates);
      }
    } catch (err) {
      setError('Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  const getAutoRecommendation = async () => {
    if (!criteria.equipment_category) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'select_optimal',
          criteria: {
            ...criteria,
            home_age: criteria.home_age ? parseInt(criteria.home_age) : undefined,
            square_footage: criteria.square_footage ? parseInt(criteria.square_footage) : undefined,
          },
        }),
      });
      
      const data: ApiResponse<TemplateSelectionResponse> = await response.json();
      
      if (data.success && data.data) {
        setAutoRecommendation(data.data);
        setSelectedTemplate(data.data.selected_template);
      } else {
        setError(data.message || 'Failed to get template recommendation');
      }
    } catch (err) {
      setError('Failed to get template recommendation');
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!selectedTemplate || !projectDetails.planned_start_date) {
      setError('Please complete all required fields');
      return;
    }

    try {
      setLoading(true);
      const projectData: ProjectCreateRequest = {
        template_selection: 'manual',
        template_id: selectedTemplate.id,
        project_parameters: projectDetails,
        template_customizations: autoRecommendation?.template_modifications?.modifications || [],
      };

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = `/projects/${data.data.id}`;
        }, 2000);
      } else {
        setError(data.message || 'Failed to create project');
      }
    } catch (err) {
      setError('Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
          <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-green-600 text-2xl">✅</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Project Created Successfully!</h3>
          <p className="text-gray-600 mb-4">Redirecting to project details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Project</h1>
              <p className="text-gray-600">Set up a new project with intelligent template selection</p>
            </div>
            <button
              onClick={() => window.location.href = '/projects'}
              className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3, 4].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  stepNumber <= step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {stepNumber}
                </div>
                {stepNumber < 4 && (
                  <div className={`w-16 h-1 mx-2 ${
                    stepNumber < step ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-2">
            <span className="text-sm text-gray-600">
              Step {step} of 4: {
                step === 1 ? 'Project Method' :
                step === 2 ? 'Template Selection' :
                step === 3 ? 'Project Details' :
                'Review & Create'
              }
            </span>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow">
          {/* Step 1: Project Method */}
          {step === 1 && (
            <div className="p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">How would you like to create this project?</h2>
              
              <div className="grid grid-cols-1 gap-6">
                <button
                  onClick={() => setProjectMethod('template')}
                  className={`p-6 border-2 rounded-lg text-left transition-colors ${
                    projectMethod === 'template' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 rounded-full border-2 border-blue-500 flex items-center justify-center">
                        {projectMethod === 'template' && <div className="w-3 h-3 bg-blue-500 rounded-full" />}
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">Use Intelligent Template (Recommended)</h3>
                      <p className="text-gray-600 mt-1">
                        Answer a few questions and we&apos;ll automatically select the best template and suggest optimizations
                        based on your project requirements.
                      </p>
                      <div className="mt-2 text-sm text-green-600 font-medium">
                        ✓ AI-powered selection ✓ Automatic scheduling ✓ Team suggestions
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setProjectMethod('manual')}
                  className={`p-6 border-2 rounded-lg text-left transition-colors ${
                    projectMethod === 'manual' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 rounded-full border-2 border-blue-500 flex items-center justify-center">
                        {projectMethod === 'manual' && <div className="w-3 h-3 bg-blue-500 rounded-full" />}
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">Browse Templates Manually</h3>
                      <p className="text-gray-600 mt-1">
                        Browse and select from our library of proven project templates. Good for when you know exactly
                        what template you want to use.
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              <div className="flex justify-end mt-8">
                <button
                  onClick={nextStep}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Template Selection */}
          {step === 2 && (
            <div className="p-8">
              {projectMethod === 'template' ? (
                <>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Project Requirements</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Equipment Category *
                      </label>
                      <select
                        value={criteria.equipment_category}
                        onChange={(e) => setCriteria({ ...criteria, equipment_category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select equipment type...</option>
                        {equipmentCategories.map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Property Type
                      </label>
                      <select
                        value={criteria.property_type}
                        onChange={(e) => setCriteria({ ...criteria, property_type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select property type...</option>
                        {propertyTypes.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Home Age (years)
                      </label>
                      <input
                        type="number"
                        value={criteria.home_age}
                        onChange={(e) => setCriteria({ ...criteria, home_age: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., 15"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Square Footage
                      </label>
                      <input
                        type="number"
                        value={criteria.square_footage}
                        onChange={(e) => setCriteria({ ...criteria, square_footage: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., 2000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ductwork Condition
                      </label>
                      <select
                        value={criteria.ductwork_condition}
                        onChange={(e) => setCriteria({ ...criteria, ductwork_condition: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {ductworkConditions.map(condition => (
                          <option key={condition.value} value={condition.value}>{condition.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={criteria.electrical_adequate}
                          onChange={(e) => setCriteria({ ...criteria, electrical_adequate: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Electrical panel adequate</span>
                      </label>
                    </div>
                  </div>

                  {autoRecommendation && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                      <h3 className="text-lg font-medium text-green-800 mb-2">Recommended Template</h3>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{autoRecommendation.selected_template.template_name}</p>
                          <p className="text-sm text-gray-600 mt-1">{autoRecommendation.selected_template.template_description}</p>
                          <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                            <span>📊 {autoRecommendation.selected_template.complexity_level}/10 complexity</span>
                            <span>⏱️ {autoRecommendation.selected_template.estimated_total_hours}h estimated</span>
                            <span>👥 {autoRecommendation.selected_template.typical_crew_size} person crew</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-green-600">
                            {Math.round(autoRecommendation.selected_template.confidence_score * 100)}% match
                          </div>
                          <div className="text-xs text-gray-500">Confidence</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <button
                      onClick={prevStep}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Back
                    </button>
                    <div className="space-x-4">
                      <button
                        onClick={getAutoRecommendation}
                        disabled={!criteria.equipment_category || loading}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                      >
                        {loading ? 'Getting Recommendation...' : 'Get Recommendation'}
                      </button>
                      <button
                        onClick={nextStep}
                        disabled={!selectedTemplate}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Select Template</h2>
                  
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-4 text-gray-600">Loading templates...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
                      {templates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => setSelectedTemplate(template)}
                          className={`p-4 border-2 rounded-lg text-left transition-colors ${
                            selectedTemplate?.id === template.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-medium text-gray-900">{template.template_name}</h3>
                              <p className="text-sm text-gray-600 mt-1">{template.template_description}</p>
                              <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                                <span>📊 {template.complexity_level}/10</span>
                                <span>⏱️ {template.estimated_total_hours}h</span>
                                <span>👥 {template.typical_crew_size} crew</span>
                                <span>✅ {template.usage_count} uses</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-green-600">
                                {Math.round(template.success_rate * 100)}% success
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between mt-6">
                    <button
                      onClick={prevStep}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={nextStep}
                      disabled={!selectedTemplate}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                      Continue
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: Project Details */}
          {step === 3 && (
            <div className="p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Project Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Planned Start Date *
                  </label>
                  <input
                    type="date"
                    value={projectDetails.planned_start_date}
                    onChange={(e) => setProjectDetails({ ...projectDetails, planned_start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Special Site Conditions
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Any special conditions, access restrictions, or site-specific requirements..."
                    onChange={(e) => setProjectDetails({ 
                      ...projectDetails, 
                      site_conditions: { ...projectDetails.site_conditions, notes: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Preferences
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Customer preferences, scheduling constraints, communication preferences..."
                    onChange={(e) => setProjectDetails({ 
                      ...projectDetails, 
                      customer_preferences: { ...projectDetails.customer_preferences, notes: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={prevStep}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={nextStep}
                  disabled={!projectDetails.planned_start_date}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Review Project
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Review & Create */}
          {step === 4 && (
            <div className="p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Review & Create Project</h2>
              
              <div className="space-y-6">
                {/* Selected Template */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-medium text-gray-900 mb-3">Selected Template</h3>
                  {selectedTemplate && (
                    <div>
                      <p className="font-medium">{selectedTemplate.template_name}</p>
                      <p className="text-sm text-gray-600 mt-1">{selectedTemplate.template_description}</p>
                      <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                        <span>📊 Complexity: {selectedTemplate.complexity_level}/10</span>
                        <span>⏱️ Estimated: {selectedTemplate.estimated_total_hours}h</span>
                        <span>👥 Crew Size: {selectedTemplate.typical_crew_size}</span>
                      </div>
                      {autoRecommendation && (
                        <div className="mt-2 text-sm text-green-600 font-medium">
                          AI Confidence: {Math.round(autoRecommendation.selected_template.confidence_score * 100)}%
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Project Details */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-medium text-gray-900 mb-3">Project Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Start Date:</span>
                      <span className="ml-2">{new Date(projectDetails.planned_start_date).toLocaleDateString()}</span>
                    </div>
                    {projectDetails.site_conditions.notes && (
                      <div className="col-span-2">
                        <span className="font-medium">Site Conditions:</span>
                        <p className="mt-1 text-gray-600">{projectDetails.site_conditions.notes}</p>
                      </div>
                    )}
                    {projectDetails.customer_preferences.notes && (
                      <div className="col-span-2">
                        <span className="font-medium">Customer Preferences:</span>
                        <p className="mt-1 text-gray-600">{projectDetails.customer_preferences.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Team Suggestion */}
                {autoRecommendation?.team_suggestion && (
                  <div className="bg-blue-50 rounded-lg p-6">
                    <h3 className="font-medium text-gray-900 mb-3">AI Team Suggestions</h3>
                    <p className="text-sm text-gray-600">
                      Optimal team composition and skill requirements will be automatically applied.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={prevStep}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={createProject}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  {loading ? 'Creating Project...' : 'Create Project'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}