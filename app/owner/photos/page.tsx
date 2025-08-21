'use client';

import { useState, useEffect } from 'react';
import { 
  Camera,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Calendar,
  User,
  MapPin,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Image as ImageIcon,
  Download,
  RefreshCw,
  Star,
  MessageCircle
} from 'lucide-react';
import { PieChart } from '@/components/charts';
import SafeBarChart from '@/components/charts/SafeBarChart';

interface Photo {
  id: string;
  jobId: string;
  employeeId: string;
  photoUrl: string;
  thumbnailUrl?: string;
  description?: string;
  phase: 'before' | 'during' | 'after';
  status: 'pending' | 'approved' | 'rejected';
  feedback?: string;
  submittedAt: string;
  reviewedAt?: string;
  job: {
    customerName: string;
    serviceType: string;
    address: string;
    scheduledDate: string;
  };
  employee: {
    name: string;
  };
  reviewer?: {
    name: string;
  };
}

interface PhotoSummary {
  totalPhotos: number;
  pendingPhotos: number;
  approvedPhotos: number;
  rejectedPhotos: number;
  photosToday: number;
  photosThisWeek: number;
  averageReviewTime?: string;
}

interface PhaseDistribution {
  phase: string;
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export default function PhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [summary, setSummary] = useState<PhotoSummary | null>(null);
  const [phaseDistribution, setPhaseDistribution] = useState<PhaseDistribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [feedback, setFeedback] = useState('');
  const [selectedView, setSelectedView] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetchPhotos();
  }, [statusFilter, phaseFilter]);

  const fetchPhotos = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        status: statusFilter,
        phase: phaseFilter
      });

      const response = await fetch(`/api/owner/photos?${params}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setPhotos(data.photos);
        setSummary(data.summary);
        setPhaseDistribution(data.phaseDistribution);
      } else {
        console.error('Failed to fetch photos');
      }
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoAction = async (action: 'approve' | 'reject', photoIds?: string[]) => {
    const idsToUpdate = photoIds || selectedPhotos;
    if (idsToUpdate.length === 0) return;

    try {
      const response = await fetch('/api/owner/photos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          photoIds: idsToUpdate,
          action,
          feedback: feedback || undefined
        })
      });

      if (response.ok) {
        const result = await response.json();
        fetchPhotos(); // Refresh data
        setSelectedPhotos([]);
        setFeedback('');
        console.log(result.message);
      } else {
        const error = await response.json();
        console.error('Action failed:', error.error);
      }
    } catch (error) {
      console.error('Error updating photos:', error);
    }
  };

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotos(prev => 
      prev.includes(photoId) 
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'before':
        return 'bg-blue-100 text-blue-800';
      case 'during':
        return 'bg-orange-100 text-orange-800';
      case 'after':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">Photo Approvals</h1>
          <button
            onClick={fetchPhotos}
            className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
        <div className="flex items-center space-x-3">
          {selectedPhotos.length > 0 && (
            <>
              <button
                onClick={() => handlePhotoAction('approve')}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve ({selectedPhotos.length})
              </button>
              <button
                onClick={() => handlePhotoAction('reject')}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject ({selectedPhotos.length})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <SummaryCard
            title="Pending Reviews"
            value={summary.pendingPhotos.toString()}
            icon={Clock}
            color="text-yellow-600"
            bgColor="bg-yellow-100"
          />
          <SummaryCard
            title="Approved Today"
            value={summary.photosToday.toString()}
            icon={CheckCircle}
            color="text-green-600"
            bgColor="bg-green-100"
          />
          <SummaryCard
            title="This Week"
            value={summary.photosThisWeek.toString()}
            icon={TrendingUp}
            color="text-blue-600"
            bgColor="bg-blue-100"
          />
          <SummaryCard
            title="Avg Review Time"
            value={summary.averageReviewTime ? `${summary.averageReviewTime}h` : 'N/A'}
            icon={Clock}
            color="text-purple-600"
            bgColor="bg-purple-100"
          />
        </div>
      )}

      {/* Analytics Charts */}
      {phaseDistribution.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Distribution */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Photo Status Distribution</h3>
            <PieChart
              data={[
                { name: 'Pending', value: summary?.pendingPhotos || 0 },
                { name: 'Approved', value: summary?.approvedPhotos || 0 },
                { name: 'Rejected', value: summary?.rejectedPhotos || 0 }
              ]}
              height={250}
              colors={['#f59e0b', '#10b981', '#ef4444']}
            />
          </div>

          {/* Phase Distribution */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Photos by Phase</h3>
            <SafeBarChart
              data={phaseDistribution.map(phase => ({
                phase: (phase.phase || '').charAt(0).toUpperCase() + (phase.phase || '').slice(1),
                pending: phase.pending || 0,
                approved: phase.approved || 0,
                rejected: phase.rejected || 0
              }))}
              xKey="phase"
              bars={[
                { key: 'pending', name: 'Pending', color: '#f59e0b' },
                { key: 'approved', name: 'Approved', color: '#10b981' },
                { key: 'rejected', name: 'Rejected', color: '#ef4444' }
              ]}
              height={250}
              layout="vertical"
            />
          </div>
        </div>
      )}

      {/* Main Photo Review Interface */}
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Photo Review Queue</h2>
            <div className="flex items-center space-x-3">
              {/* View Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setSelectedView('grid')}
                  className={`px-3 py-1 text-sm rounded ${selectedView === 'grid' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setSelectedView('list')}
                  className={`px-3 py-1 text-sm rounded ${selectedView === 'list' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
                >
                  List
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All Status</option>
            </select>
            <select
              value={phaseFilter}
              onChange={(e) => setPhaseFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Phases</option>
              <option value="before">Before</option>
              <option value="during">During</option>
              <option value="after">After</option>
            </select>
            {selectedPhotos.length > 0 && (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Add feedback..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Photo Grid/List */}
        {selectedView === 'grid' ? (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {photos.map((photo) => (
                <div key={photo.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  {/* Photo */}
                  <div className="relative aspect-video bg-gray-100">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-gray-400" />
                    </div>
                    <div className="absolute top-2 left-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPhaseColor(photo.phase)}`}>
                        {photo.phase}
                      </span>
                    </div>
                    <div className="absolute top-2 right-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(photo.status)}`}>
                        {photo.status}
                      </span>
                    </div>
                    {statusFilter === 'pending' && (
                      <div className="absolute bottom-2 left-2">
                        <input
                          type="checkbox"
                          checked={selectedPhotos.includes(photo.id)}
                          onChange={() => togglePhotoSelection(photo.id)}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300"
                        />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {photo.job.customerName}
                        </h4>
                        <button
                          onClick={() => setSelectedPhoto(photo)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">{photo.job.serviceType}</p>
                      <div className="flex items-center text-xs text-gray-500">
                        <User className="h-3 w-3 mr-1" />
                        {photo.employee.name}
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(photo.submittedAt).toLocaleDateString()}
                      </div>
                      {photo.description && (
                        <p className="text-xs text-gray-600 line-clamp-2">{photo.description}</p>
                      )}
                    </div>

                    {/* Quick Actions */}
                    {photo.status === 'pending' && (
                      <div className="mt-3 flex space-x-2">
                        <button
                          onClick={() => handlePhotoAction('approve', [photo.id])}
                          className="flex-1 text-xs bg-green-600 text-white py-1 px-2 rounded hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handlePhotoAction('reject', [photo.id])}
                          className="flex-1 text-xs bg-red-600 text-white py-1 px-2 rounded hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // List View
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Photo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {photos.map((photo) => (
                  <tr key={photo.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {statusFilter === 'pending' && (
                          <input
                            type="checkbox"
                            checked={selectedPhotos.includes(photo.id)}
                            onChange={() => togglePhotoSelection(photo.id)}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300 mr-3"
                          />
                        )}
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center">
                            <Camera className="h-5 w-5 text-gray-400" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPhaseColor(photo.phase)}`}>
                            {photo.phase}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{photo.job.customerName}</div>
                      <div className="text-sm text-gray-500">{photo.job.serviceType}</div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {photo.job.address}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {photo.employee.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(photo.status)}`}>
                        {photo.status}
                      </span>
                      {photo.feedback && (
                        <div className="text-xs text-gray-500 mt-1 flex items-center">
                          <MessageCircle className="h-3 w-3 mr-1" />
                          {photo.feedback.substring(0, 50)}...
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(photo.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedPhoto(photo)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {photo.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handlePhotoAction('approve', [photo.id])}
                              className="text-green-600 hover:text-green-900"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handlePhotoAction('reject', [photo.id])}
                              className="text-red-600 hover:text-red-900"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {photos.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Camera className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No photos found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No photos match your current filters
            </p>
          </div>
        )}
      </div>

      {/* Photo Details Modal */}
      {selectedPhoto && (
        <PhotoDetailsModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          onAction={(action) => {
            handlePhotoAction(action, [selectedPhoto.id]);
            setSelectedPhoto(null);
          }}
        />
      )}
    </div>
  );
}

// Summary Card Component
function SummaryCard({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  bgColor 
}: {
  title: string;
  value: string;
  icon: any;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow card-hover">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${bgColor}`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
      </div>
    </div>
  );
}

// Photo Details Modal Component (placeholder)
function PhotoDetailsModal({ 
  photo, 
  onClose, 
  onAction 
}: { 
  photo: Photo; 
  onClose: () => void; 
  onAction: (action: 'approve' | 'reject') => void; 
}) {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-[800px] shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Photo Review</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Photo */}
            <div className="space-y-4">
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <ImageIcon className="h-16 w-16 text-gray-400" />
              </div>
              <div className="flex space-x-2">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${photo.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : photo.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {photo.status}
                </span>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${photo.phase === 'before' ? 'bg-blue-100 text-blue-800' : photo.phase === 'during' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                  {photo.phase}
                </span>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">Job Details</h4>
                <p className="text-sm text-gray-600">{photo.job.customerName}</p>
                <p className="text-sm text-gray-600">{photo.job.serviceType}</p>
                <p className="text-sm text-gray-500">{photo.job.address}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">Submitted By</h4>
                <p className="text-sm text-gray-600">{photo.employee.name}</p>
                <p className="text-sm text-gray-500">{new Date(photo.submittedAt).toLocaleDateString()}</p>
              </div>

              {photo.description && (
                <div>
                  <h4 className="font-medium text-gray-900">Description</h4>
                  <p className="text-sm text-gray-600">{photo.description}</p>
                </div>
              )}

              {photo.feedback && (
                <div>
                  <h4 className="font-medium text-gray-900">Feedback</h4>
                  <p className="text-sm text-gray-600">{photo.feedback}</p>
                  {photo.reviewer && (
                    <p className="text-xs text-gray-500 mt-1">By {photo.reviewer.name}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {photo.status === 'pending' && (
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => onAction('reject')}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Reject
              </button>
              <button
                onClick={() => onAction('approve')}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Approve
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}