export default function SchedulePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Project Scheduling</h1>
          <p className="text-gray-600">Gantt charts with Critical Path Method</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="mx-auto h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-indigo-600 text-2xl">📅</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Intelligent Scheduling</h3>
          <p className="text-gray-600 mb-4">
            This feature is coming soon. The scheduling engine with CPM is fully built.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
            <strong>Backend Ready:</strong> Critical Path Method, resource constraints, dependency management
          </div>
        </div>
      </div>
    </div>
  );
}