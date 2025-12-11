'use client';

import MainLayout from '@/components/layout/MainLayout';
import { useEffect, useState } from 'react';
import { BookOpen, AlertCircle, Loader2, Plus, Edit2, Trash2, CheckCircle2, XCircle, ChevronDown, ChevronRight, Upload, X, Search, Filter, Calendar } from 'lucide-react';
import { useRequireAdmin } from '@/hooks/useRequireAdmin';
import { moduleApi, lessonApi, Module, Lesson } from '@/lib/api';
import VideoUploadForm from '@/components/admin/VideoUploadForm';

export default function AdminModulesPage() {
  useRequireAdmin();

  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('');
  
  // Module modals
  const [showCreateModuleModal, setShowCreateModuleModal] = useState(false);
  const [showEditModuleModal, setShowEditModuleModal] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [moduleToDelete, setModuleToDelete] = useState<Module | null>(null);
  
  // Lesson modals
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [showCreateLessonModal, setShowCreateLessonModal] = useState(false);
  const [showEditLessonModal, setShowEditLessonModal] = useState(false);
  const [showUploadVideoModal, setShowUploadVideoModal] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState<string | null>(null);
  const [processingLesson, setProcessingLesson] = useState<string | null>(null);

  // Form states
  const [moduleForm, setModuleForm] = useState({
    title: '',
    description: '',
    allowedCategories: [] as string[],
  });

  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    order: 0,
  });

  const categoryOptions = [
    { value: 'DEALER', label: 'Dealer' },
    { value: 'EMPLOYEE', label: 'Employee' },
    { value: 'TECHNICIAN', label: 'Technician' },
    { value: 'STAKEHOLDER', label: 'Stakeholder' },
    { value: 'INTERN', label: 'Intern' },
    { value: 'VENDOR', label: 'Vendor' },
  ];

  const fetchModules = async () => {
    try {
      setLoading(true);
      setError(null);
      setNotification(null);

      const modulesData = await moduleApi.listAllModules();
      setModules(modulesData);
    } catch (err: any) {
      console.error('Error fetching modules:', err);
      const errorMessage = err?.message || 'Failed to load modules. Please try again.';
      setError(errorMessage);
      setNotification({ type: 'error', message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const toggleModuleExpansion = (moduleId: string) => {
    setExpandedModules((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  // Module handlers
  const handleCreateModule = async () => {
    try {
      if (!moduleForm.title.trim()) {
        showNotification('error', 'Module title is required');
        return;
      }

      await moduleApi.createModule({
        title: moduleForm.title,
        description: moduleForm.description || undefined,
        allowedCategories: moduleForm.allowedCategories,
      });

      showNotification('success', 'Module created successfully');
      setShowCreateModuleModal(false);
      setModuleForm({ title: '', description: '', allowedCategories: [] });
      fetchModules();
    } catch (err: any) {
      console.error('Error creating module:', err);
      showNotification('error', err?.message || 'Failed to create module');
    }
  };

  const handleEditModule = (module: Module) => {
    setEditingModule(module);
    setModuleForm({
      title: module.title,
      description: module.description || '',
      allowedCategories: module.allowedCategories || [],
    });
    setShowEditModuleModal(true);
  };

  const handleUpdateModule = async () => {
    if (!editingModule) return;

    try {
      if (!moduleForm.title.trim()) {
        showNotification('error', 'Module title is required');
        return;
      }

      await moduleApi.updateModule(editingModule.id, {
        title: moduleForm.title,
        description: moduleForm.description || null,
        allowedCategories: moduleForm.allowedCategories,
      });

      showNotification('success', 'Module updated successfully');
      setShowEditModuleModal(false);
      setEditingModule(null);
      setModuleForm({ title: '', description: '', allowedCategories: [] });
      fetchModules();
    } catch (err: any) {
      console.error('Error updating module:', err);
      showNotification('error', err?.message || 'Failed to update module');
    }
  };

  const handleDeleteModule = async () => {
    if (!moduleToDelete) return;

    if (!confirm(`Are you sure you want to delete module "${moduleToDelete.title}"? This will also delete all lessons in this module.`)) {
      setModuleToDelete(null);
      return;
    }

    try {
      await moduleApi.deleteModule(moduleToDelete.id);
      showNotification('success', 'Module deleted successfully');
      setModuleToDelete(null);
      fetchModules();
    } catch (err: any) {
      console.error('Error deleting module:', err);
      showNotification('error', err?.message || 'Failed to delete module');
      setModuleToDelete(null);
    }
  };

  // Lesson handlers
  const handleCreateLesson = async () => {
    if (!selectedModuleId) return;

    try {
      if (!lessonForm.title.trim()) {
        showNotification('error', 'Lesson title is required');
        return;
      }

      await lessonApi.createLesson(selectedModuleId, {
        title: lessonForm.title,
        description: lessonForm.description || undefined,
        order: lessonForm.order || undefined,
      });

      showNotification('success', 'Lesson created successfully');
      setShowCreateLessonModal(false);
      setSelectedModuleId(null);
      setLessonForm({ title: '', description: '', order: 0 });
      fetchModules();
    } catch (err: any) {
      console.error('Error creating lesson:', err);
      showNotification('error', err?.message || 'Failed to create lesson');
    }
  };

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setLessonForm({
      title: lesson.title,
      description: lesson.description || '',
      order: lesson.order,
    });
    setShowEditLessonModal(true);
  };

  const handleUpdateLesson = async () => {
    if (!editingLesson) return;

    try {
      if (!lessonForm.title.trim()) {
        showNotification('error', 'Lesson title is required');
        return;
      }

      await lessonApi.updateLesson(editingLesson.id, {
        title: lessonForm.title,
        description: lessonForm.description || null,
        order: lessonForm.order,
      });

      showNotification('success', 'Lesson updated successfully');
      setShowEditLessonModal(false);
      setEditingLesson(null);
      setLessonForm({ title: '', description: '', order: 0 });
      fetchModules();
    } catch (err: any) {
      console.error('Error updating lesson:', err);
      showNotification('error', err?.message || 'Failed to update lesson');
    }
  };

  const handleDeleteLesson = async () => {
    if (!lessonToDelete) return;

    if (!confirm(`Are you sure you want to delete lesson "${lessonToDelete.title}"?`)) {
      setLessonToDelete(null);
      return;
    }

    try {
      setProcessingLesson(lessonToDelete.id);
      await lessonApi.deleteLesson(lessonToDelete.id);
      showNotification('success', 'Lesson deleted successfully');
      setLessonToDelete(null);
      setProcessingLesson(null);
      fetchModules();
    } catch (err: any) {
      console.error('Error deleting lesson:', err);
      showNotification('error', err?.message || 'Failed to delete lesson');
      setLessonToDelete(null);
      setProcessingLesson(null);
    }
  };

  const handleUploadVideo = async (lessonId: string, formData: FormData) => {
    try {
      setUploadingVideo(lessonId);
      await lessonApi.uploadLessonVideo(lessonId, formData);
      showNotification('success', 'Video upload started. Processing will begin shortly.');
      setShowUploadVideoModal(false);
      setUploadingVideo(null);
      fetchModules();
    } catch (err: any) {
      console.error('Error uploading video:', err);
      showNotification('error', err?.message || 'Failed to upload video');
      setUploadingVideo(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Filter modules based on search query and date filter
  const filteredModules = modules.filter((module) => {
    // Search filter - check title and description
    const matchesSearch = searchQuery === '' || 
      module.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (module.description && module.description.toLowerCase().includes(searchQuery.toLowerCase()));

    // Date filter - check if module was created on the selected date
    if (dateFilter && matchesSearch) {
      const moduleDate = new Date(module.createdAt).toISOString().split('T')[0];
      return moduleDate === dateFilter;
    }

    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      UPLOADED: { color: 'bg-yellow-100 text-yellow-800', label: 'Uploaded' },
      PROCESSING: { color: 'bg-blue-100 text-blue-800', label: 'Processing' },
      READY: { color: 'bg-green-100 text-green-800', label: 'Ready' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.UPLOADED;

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="h-8 w-8 text-[#0B214A]" />
              <h1 className="text-3xl font-bold text-gray-900">Modules & Lessons</h1>
            </div>
            <p className="text-gray-600">Manage learning modules and their lessons</p>
          </div>
          <button
            onClick={() => {
              setModuleForm({ title: '', description: '', allowedCategories: [] });
              setShowCreateModuleModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0B214A] rounded-lg hover:bg-[#0a1a3a] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Module
          </button>
        </div>

        {/* Notification Banner */}
        {notification && (
          <div
            className={`border px-4 py-3 rounded-lg flex items-center justify-between gap-2 ${
              notification.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Error Banner */}
        {error && !notification && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Search and Filter Bar */}
        {!loading && modules.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search modules by title or description..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B214A]"
                />
              </div>
              {/* Date Filter */}
              <div className="relative sm:w-64">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B214A]"
                />
                {dateFilter && (
                  <button
                    onClick={() => setDateFilter('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    title="Clear date filter"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            {/* Results count */}
            {(searchQuery || dateFilter) && (
              <div className="mt-3 text-sm text-gray-600">
                Showing {filteredModules.length} of {modules.length} module{modules.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-100 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {modules.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <BookOpen className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No modules found</h3>
                <p className="text-gray-500 mb-4">Create your first module to get started.</p>
                <button
                  onClick={() => {
                    setModuleForm({ title: '', description: '', allowedCategories: [] });
                    setShowCreateModuleModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0B214A] rounded-lg hover:bg-[#0a1a3a] transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Create Module
                </button>
              </div>
            ) : filteredModules.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No modules match your filters</h3>
                <p className="text-gray-500 mb-4">Try adjusting your search or date filter.</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setDateFilter('');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0B214A] rounded-lg hover:bg-[#0a1a3a] transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              filteredModules.map((module) => {
                const isExpanded = expandedModules.has(module.id);
                const lessons = module.lessons || [];
                const lessonsCount = lessons.length;

                return (
                  <div key={module.id} className="bg-white border border-gray-200 rounded-lg shadow-sm">
                    {/* Module Header */}
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <button
                              onClick={() => toggleModuleExpansion(module.id)}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-5 w-5" />
                              ) : (
                                <ChevronRight className="h-5 w-5" />
                              )}
                            </button>
                            <h3 className="text-xl font-semibold text-gray-900">{module.title}</h3>
                          </div>
                          {module.description && (
                            <p className="text-sm text-gray-600 ml-8 mb-2">{module.description}</p>
                          )}
                          <div className="flex items-center gap-4 ml-8 text-sm text-gray-500">
                            <span>{lessonsCount} lesson{lessonsCount !== 1 ? 's' : ''}</span>
                            <span>•</span>
                            <span>Created {formatDate(module.createdAt)}</span>
                            {module.allowedCategories && module.allowedCategories.length > 0 && (
                              <>
                                <span>•</span>
                                <span>
                                  Categories: {module.allowedCategories.map(cat => {
                                    const catOption = categoryOptions.find(opt => opt.value === cat);
                                    return catOption?.label || cat;
                                  }).join(', ')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedModuleId(module.id);
                              setLessonForm({ title: '', description: '', order: lessonsCount });
                              setShowCreateLessonModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-[#0B214A] border border-[#0B214A] rounded-lg hover:bg-[#0B214A] hover:text-white transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                            Add Lesson
                          </button>
                          <button
                            onClick={() => handleEditModule(module)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => setModuleToDelete(module)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Lessons List */}
                    {isExpanded && (
                      <div className="border-t border-gray-200">
                        {lessons.length === 0 ? (
                          <div className="p-6 text-center text-gray-500">
                            <p>No lessons in this module yet. Click "Add Lesson" to create one.</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-200">
                            {lessons.map((lesson) => (
                              <div key={lesson.id} className="p-6 hover:bg-gray-50">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <span className="text-sm font-medium text-gray-500">
                                        #{lesson.order}
                                      </span>
                                      <h4 className="text-lg font-medium text-gray-900">{lesson.title}</h4>
                                      {getStatusBadge(lesson.status)}
                                    </div>
                                    {lesson.description && (
                                      <p className="text-sm text-gray-600 ml-8 mb-2">{lesson.description}</p>
                                    )}
                                    <div className="flex items-center gap-4 ml-8 text-sm text-gray-500">
                                      {lesson.duration && (
                                        <>
                                          <span>Duration: {Math.floor(lesson.duration / 60)}:{(lesson.duration % 60).toString().padStart(2, '0')}</span>
                                          <span>•</span>
                                        </>
                                      )}
                                      {lesson.thumbnailUrl && (
                                        <span className="text-green-600">Thumbnail uploaded</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {lesson.status !== 'READY' && (
                                      <button
                                        onClick={() => {
                                          setEditingLesson(lesson);
                                          setShowUploadVideoModal(true);
                                        }}
                                        disabled={uploadingVideo === lesson.id}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                                      >
                                        {uploadingVideo === lesson.id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Upload className="h-4 w-4" />
                                        )}
                                        Upload Video
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleEditLesson(lesson)}
                                      disabled={processingLesson === lesson.id}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => setLessonToDelete(lesson)}
                                      disabled={processingLesson === lesson.id}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                                    >
                                      {processingLesson === lesson.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-4 w-4" />
                                      )}
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Create Module Modal */}
        {showCreateModuleModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Create Module</h2>
                  <button
                    onClick={() => {
                      setShowCreateModuleModal(false);
                      setModuleForm({ title: '', description: '', allowedCategories: [] });
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={moduleForm.title}
                    onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B214A]"
                    placeholder="Enter module title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={moduleForm.description}
                    onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B214A]"
                    rows={3}
                    placeholder="Enter module description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Allowed Categories
                  </label>
                  <div className="space-y-2">
                    {categoryOptions.map((option) => (
                      <label key={option.value} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={moduleForm.allowedCategories.includes(option.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setModuleForm({
                                ...moduleForm,
                                allowedCategories: [...moduleForm.allowedCategories, option.value],
                              });
                            } else {
                              setModuleForm({
                                ...moduleForm,
                                allowedCategories: moduleForm.allowedCategories.filter(
                                  (cat) => cat !== option.value
                                ),
                              });
                            }
                          }}
                          className="rounded border-gray-300 text-[#0B214A] focus:ring-[#0B214A]"
                        />
                        <span className="text-sm text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCreateModuleModal(false);
                    setModuleForm({ title: '', description: '', allowedCategories: [] });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateModule}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#0B214A] rounded-lg hover:bg-[#0a1a3a] transition-colors"
                >
                  Create Module
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Module Modal */}
        {showEditModuleModal && editingModule && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Edit Module</h2>
                  <button
                    onClick={() => {
                      setShowEditModuleModal(false);
                      setEditingModule(null);
                      setModuleForm({ title: '', description: '', allowedCategories: [] });
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={moduleForm.title}
                    onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B214A]"
                    placeholder="Enter module title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={moduleForm.description}
                    onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B214A]"
                    rows={3}
                    placeholder="Enter module description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Allowed Categories
                  </label>
                  <div className="space-y-2">
                    {categoryOptions.map((option) => (
                      <label key={option.value} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={moduleForm.allowedCategories.includes(option.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setModuleForm({
                                ...moduleForm,
                                allowedCategories: [...moduleForm.allowedCategories, option.value],
                              });
                            } else {
                              setModuleForm({
                                ...moduleForm,
                                allowedCategories: moduleForm.allowedCategories.filter(
                                  (cat) => cat !== option.value
                                ),
                              });
                            }
                          }}
                          className="rounded border-gray-300 text-[#0B214A] focus:ring-[#0B214A]"
                        />
                        <span className="text-sm text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowEditModuleModal(false);
                    setEditingModule(null);
                    setModuleForm({ title: '', description: '', allowedCategories: [] });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateModule}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#0B214A] rounded-lg hover:bg-[#0a1a3a] transition-colors"
                >
                  Update Module
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Lesson Modal */}
        {showCreateLessonModal && selectedModuleId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Create Lesson</h2>
                  <button
                    onClick={() => {
                      setShowCreateLessonModal(false);
                      setSelectedModuleId(null);
                      setLessonForm({ title: '', description: '', order: 0 });
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={lessonForm.title}
                    onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B214A]"
                    placeholder="Enter lesson title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={lessonForm.description}
                    onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B214A]"
                    rows={3}
                    placeholder="Enter lesson description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order
                  </label>
                  <input
                    type="number"
                    value={lessonForm.order}
                    onChange={(e) => setLessonForm({ ...lessonForm, order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B214A]"
                    placeholder="Lesson order (optional)"
                    min="0"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCreateLessonModal(false);
                    setSelectedModuleId(null);
                    setLessonForm({ title: '', description: '', order: 0 });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateLesson}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#0B214A] rounded-lg hover:bg-[#0a1a3a] transition-colors"
                >
                  Create Lesson
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Lesson Modal */}
        {showEditLessonModal && editingLesson && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Edit Lesson</h2>
                  <button
                    onClick={() => {
                      setShowEditLessonModal(false);
                      setEditingLesson(null);
                      setLessonForm({ title: '', description: '', order: 0 });
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={lessonForm.title}
                    onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B214A]"
                    placeholder="Enter lesson title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={lessonForm.description}
                    onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B214A]"
                    rows={3}
                    placeholder="Enter lesson description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order
                  </label>
                  <input
                    type="number"
                    value={lessonForm.order}
                    onChange={(e) => setLessonForm({ ...lessonForm, order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B214A]"
                    placeholder="Lesson order"
                    min="0"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowEditLessonModal(false);
                    setEditingLesson(null);
                    setLessonForm({ title: '', description: '', order: 0 });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateLesson}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#0B214A] rounded-lg hover:bg-[#0a1a3a] transition-colors"
                >
                  Update Lesson
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Video Modal */}
        {showUploadVideoModal && editingLesson && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Upload Video for Lesson</h2>
                  <button
                    onClick={() => {
                      setShowUploadVideoModal(false);
                      setEditingLesson(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <VideoUploadForm
                  lessonId={editingLesson.id}
                  lessonTitle={editingLesson.title}
                  onUpload={handleUploadVideo}
                  onCancel={() => {
                    setShowUploadVideoModal(false);
                    setEditingLesson(null);
                  }}
                  uploading={uploadingVideo === editingLesson.id}
                />
              </div>
            </div>
          </div>
        )}

        {/* Delete Module Confirmation */}
        {moduleToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Delete Module</h2>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete module "{moduleToDelete.title}"? This will also delete all lessons in this module. This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setModuleToDelete(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteModule}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Lesson Confirmation */}
        {lessonToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Delete Lesson</h2>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete lesson "{lessonToDelete.title}"? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setLessonToDelete(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteLesson}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
