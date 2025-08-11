'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'

export default function StartupUpdatesManager({ startupId }) {
  const { user } = useAuth()
  const [updates, setUpdates] = useState([])
  const [showAddUpdate, setShowAddUpdate] = useState(false)
  const [editingUpdate, setEditingUpdate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newUpdate, setNewUpdate] = useState({
    title: '',
    content: '',
    milestone_type: 'other',
    is_public: true
  })

  useEffect(() => {
    if (startupId) {
      fetchUpdates()
    }
  }, [startupId])

  const fetchUpdates = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('startup_updates')
        .select('*')
        .eq('startup_id', startupId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setUpdates(data || [])
    } catch (error) {
      console.error('Error fetching updates:', error)
      toast.error('Failed to load updates')
    } finally {
      setLoading(false)
    }
  }

  const handleAddUpdate = async () => {
    try {
      if (!newUpdate.title.trim() || !newUpdate.content.trim()) {
        toast.error('Title and content are required')
        return
      }

      const { data, error } = await supabase
        .from('startup_updates')
        .insert({
          ...newUpdate,
          startup_id: startupId
        })
        .select()
        .single()

      if (error) throw error

      setUpdates([data, ...updates])
      setNewUpdate({
        title: '',
        content: '',
        milestone_type: 'other',
        is_public: true
      })
      setShowAddUpdate(false)
      toast.success('Update added successfully!')
    } catch (error) {
      console.error('Error adding update:', error)
      toast.error('Failed to add update')
    }
  }

  const handleUpdateUpdate = async () => {
    try {
      if (!editingUpdate.title.trim() || !editingUpdate.content.trim()) {
        toast.error('Title and content are required')
        return
      }

      const { data, error } = await supabase
        .from('startup_updates')
        .update({
          title: editingUpdate.title,
          content: editingUpdate.content,
          milestone_type: editingUpdate.milestone_type,
          is_public: editingUpdate.is_public
        })
        .eq('id', editingUpdate.id)
        .select()
        .single()

      if (error) throw error

      setUpdates(updates.map(update => 
        update.id === editingUpdate.id ? data : update
      ))
      setEditingUpdate(null)
      toast.success('Update saved successfully!')
    } catch (error) {
      console.error('Error updating update:', error)
      toast.error('Failed to update')
    }
  }

  const handleDeleteUpdate = async (updateId) => {
    if (!confirm('Are you sure you want to delete this update?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('startup_updates')
        .delete()
        .eq('id', updateId)

      if (error) throw error

      setUpdates(updates.filter(update => update.id !== updateId))
      toast.success('Update deleted successfully!')
    } catch (error) {
      console.error('Error deleting update:', error)
      toast.error('Failed to delete update')
    }
  }

  const getMilestoneTypeColor = (type) => {
    const colors = {
      funding: 'bg-green-100 text-green-800',
      product: 'bg-blue-100 text-blue-800',
      team: 'bg-purple-100 text-purple-800',
      partnership: 'bg-yellow-100 text-yellow-800',
      revenue: 'bg-emerald-100 text-emerald-800',
      other: 'bg-gray-100 text-gray-800'
    }
    return colors[type] || colors.other
  }

  const getMilestoneTypeLabel = (type) => {
    const labels = {
      funding: 'Funding',
      product: 'Product',
      team: 'Team',
      partnership: 'Partnership',
      revenue: 'Revenue',
      other: 'Other'
    }
    return labels[type] || 'Other'
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-gray-900">Startup Updates</h3>
        <button
          onClick={() => setShowAddUpdate(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Add Update
        </button>
      </div>

      {/* Updates List */}
      <div className="space-y-4">
        {updates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No updates yet. Share your startup's journey!
          </div>
        ) : (
          updates.map((update) => (
            <div key={update.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-3">
                  <h4 className="text-lg font-semibold text-gray-900">{update.title}</h4>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getMilestoneTypeColor(update.milestone_type)}`}>
                    {getMilestoneTypeLabel(update.milestone_type)}
                  </span>
                  {!update.is_public && (
                    <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Private
                    </span>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setEditingUpdate(update)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteUpdate(update.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="text-gray-700 mb-3">{update.content}</p>
              <p className="text-sm text-gray-500">
                {new Date(update.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Add Update Modal */}
      {showAddUpdate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Add Update</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Update title *"
                value={newUpdate.title}
                onChange={(e) => setNewUpdate({...newUpdate, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                placeholder="Update content *"
                value={newUpdate.content}
                onChange={(e) => setNewUpdate({...newUpdate, content: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
              <select
                value={newUpdate.milestone_type}
                onChange={(e) => setNewUpdate({...newUpdate, milestone_type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="other">Other</option>
                <option value="funding">Funding</option>
                <option value="product">Product</option>
                <option value="team">Team</option>
                <option value="partnership">Partnership</option>
                <option value="revenue">Revenue</option>
              </select>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newUpdate.is_public}
                  onChange={(e) => setNewUpdate({...newUpdate, is_public: e.target.checked})}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Make this update public</span>
              </label>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowAddUpdate(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Update Modal */}
      {editingUpdate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Edit Update</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Update title *"
                value={editingUpdate.title}
                onChange={(e) => setEditingUpdate({...editingUpdate, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                placeholder="Update content *"
                value={editingUpdate.content}
                onChange={(e) => setEditingUpdate({...editingUpdate, content: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
              <select
                value={editingUpdate.milestone_type}
                onChange={(e) => setEditingUpdate({...editingUpdate, milestone_type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="other">Other</option>
                <option value="funding">Funding</option>
                <option value="product">Product</option>
                <option value="team">Team</option>
                <option value="partnership">Partnership</option>
                <option value="revenue">Revenue</option>
              </select>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={editingUpdate.is_public}
                  onChange={(e) => setEditingUpdate({...editingUpdate, is_public: e.target.checked})}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Make this update public</span>
              </label>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setEditingUpdate(null)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}