import { useState } from 'react';
import { Search, Plus, X, CalendarDays, Clock, MapPin, Users, Edit2, Trash2, Calendar as CalendarIcon, Flag, BookOpen, Star } from 'lucide-react';

// --- MOCK DATA ---
const initialEvents = [
  { 
    id: 'EVT-001', title: "First Term Examinations Begin", date: "2026-04-25", timeFrom: "08:00", timeTo: "13:30", 
    location: "Main Examination Halls", type: "Exam", audience: "All Grades", status: "Upcoming", isSpecial: true 
  },
  { 
    id: 'EVT-002', title: "School Closed for Vesak Poya", date: "2026-05-01", timeFrom: "00:00", timeTo: "23:59", 
    location: "N/A", type: "Holiday", audience: "All Students & Staff", status: "Upcoming", isSpecial: false 
  },
  { 
    id: 'EVT-003', title: "Annual Inter-House Sports Meet", date: "2026-05-15", timeFrom: "07:30", timeTo: "16:00", 
    location: "College Main Ground", type: "Activity", audience: "All Students", status: "Upcoming", isSpecial: true 
  },
  { 
    id: 'EVT-004', title: "Grade 10 Parent-Teacher Meeting", date: "2026-05-20", timeFrom: "14:00", timeTo: "16:30", 
    location: "Main Hall", type: "Academic", audience: "Grade 10 Parents", status: "Upcoming", isSpecial: false 
  },
  { 
    id: 'EVT-005', title: "Science Fair 2026", date: "2026-06-10", timeFrom: "09:00", timeTo: "15:00", 
    location: "Science Block", type: "Activity", audience: "Grades 10-13", status: "Draft", isSpecial: false 
  },
];

// Helper to convert 24h "14:30" format to "02:30 PM"
const formatTime = (timeStr: string) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hours = parseInt(h, 10);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;
  return `${formattedHours.toString().padStart(2, '0')}:${m} ${ampm}`;
};

export default function ManageCalendar() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [events, setEvents] = useState(initialEvents);

  // Form & Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '', date: '', timeFrom: '', timeTo: '', location: '', type: '', audience: '', status: 'Upcoming', isSpecial: false
  });
  
  // Filter Logic
  const filteredEvents = events.filter(evt => {
    const matchesSearch = evt.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || evt.type.toLowerCase() === typeFilter.toLowerCase();
    return matchesSearch && matchesType;
  });

  // Helper function to pick the right icon and color for event types
  const getEventTypeStyles = (type: string) => {
    switch(type) {
      case 'Exam': return { color: 'text-amber-600 bg-amber-50 border-amber-200', icon: BookOpen };
      case 'Holiday': return { color: 'text-rose-600 bg-rose-50 border-rose-200', icon: Flag };
      case 'Activity': return { color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: Users };
      case 'Academic': return { color: 'text-blue-600 bg-blue-50 border-blue-200', icon: CalendarIcon };
      default: return { color: 'text-slate-600 bg-slate-50 border-slate-200', icon: CalendarDays };
    }
  };

  // --- FORM HANDLERS ---
  const openAddModal = () => {
    setFormMode('add');
    setEditingEventId(null);
    setFormData({ title: '', date: '', timeFrom: '', timeTo: '', location: '', type: '', audience: '', status: 'Upcoming', isSpecial: false });
    setIsFormModalOpen(true);
  };

  const openEditModal = (event: any) => {
    setFormMode('edit');
    setEditingEventId(event.id);
    setFormData({
      title: event.title, date: event.date, timeFrom: event.timeFrom, timeTo: event.timeTo,
      location: event.location, type: event.type, audience: event.audience, status: event.status, isSpecial: event.isSpecial || false
    });
    setIsFormModalOpen(true);
  };

  const handleDeleteEvent = (id: string) => {
    if(window.confirm("Are you sure you want to delete this event?")) {
      setEvents(events.filter(evt => evt.id !== id));
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submittedEvent = {
      id: formMode === 'edit' && editingEventId ? editingEventId : `EVT-${Math.floor(Math.random() * 10000)}`,
      title: formData.title,
      date: formData.date,
      timeFrom: formData.timeFrom,
      timeTo: formData.timeTo,
      location: formData.location,
      type: formData.type,
      audience: formData.audience,
      status: formData.status,
      isSpecial: formData.isSpecial
    };

    if (formMode === 'edit') {
      setEvents(events.map(evt => evt.id === editingEventId ? submittedEvent : evt));
    } else {
      // Sort the events by date when adding a new one
      const newEvents = [submittedEvent, ...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setEvents(newEvents);
    }
    
    setIsFormModalOpen(false);
  };

  return (
    <div className="space-y-6 relative">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">School Calendar</h1>
          <p className="text-sm text-slate-500 font-medium">Manage academic events, holidays, exams, and activities.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={18} /> Add Event
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" placeholder="Search events by title..." 
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm"
          />
        </div>
        <select 
          value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 text-slate-700 font-medium text-sm"
        >
          <option value="all">All Event Types</option>
          <option value="Academic">Academic</option>
          <option value="Exam">Examinations</option>
          <option value="Activity">Activities & Sports</option>
          <option value="Holiday">Holidays</option>
        </select>
      </div>

      {/* Events Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                <th className="p-4 font-semibold">Event Details</th>
                <th className="p-4 font-semibold">Date & Time</th>
                <th className="p-4 font-semibold">Location & Audience</th>
                <th className="p-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((evt) => {
                const { color, icon: TypeIcon } = getEventTypeStyles(evt.type);
                
                return (
                  <tr key={evt.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${color} shrink-0`}>
                          <TypeIcon size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 flex items-center gap-2">
                            {evt.title}
                            {evt.isSpecial && (
                             <span title="Special Event" className="flex">
                              <Star size={14} className="text-amber-500 fill-amber-500" />
                              </span>
                               )}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${color}`}>
                              {evt.type}
                            </span>
                            {evt.status === 'Draft' && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                                Draft
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1">
                        <CalendarDays size={14} className="text-blue-500" /> 
                        {new Date(evt.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                        <Clock size={14} className="text-slate-400" /> 
                        {evt.timeFrom === "00:00" && evt.timeTo === "23:59" ? "All Day" : `${formatTime(evt.timeFrom)} - ${formatTime(evt.timeTo)}`}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm text-slate-700 mb-1">
                        <MapPin size={14} className="text-slate-400" /> {evt.location}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                        <Users size={14} className="text-slate-400" /> {evt.audience}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEditModal(evt)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit Event">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => handleDeleteEvent(evt.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Delete Event">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredEvents.length === 0 && (
            <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
              <CalendarDays size={32} className="text-slate-300" />
              <p>No events found matching your filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* --- ADD / EDIT EVENT MODAL --- */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="bg-slate-50 border-b border-slate-100 p-5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${formMode === 'add' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                  {formMode === 'add' ? <CalendarDays size={20} /> : <Edit2 size={20} />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    {formMode === 'add' ? 'Add Calendar Event' : 'Edit Calendar Event'}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {formMode === 'add' ? 'Schedule a new school activity or exam' : 'Update existing event details'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsFormModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors"><X size={20} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="event-form" onSubmit={handleFormSubmit} className="space-y-6">
                
                {/* General Info */}
                <div>
                  <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-slate-800">General Information</h3>
                    {/* SPECIAL EVENT CHECKBOX */}
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={formData.isSpecial} 
                        onChange={(e) => setFormData({...formData, isSpecial: e.target.checked})}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 transition-colors cursor-pointer"
                      />
                      <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1 group-hover:text-amber-600 transition-colors text-slate-500">
                        <Star size={14} className={formData.isSpecial ? "fill-amber-500 text-amber-500" : ""} /> 
                        Mark as Special Event
                      </span>
                    </label>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Event Title</label>
                      <input type="text" required placeholder="e.g. Annual Inter-House Sports Meet" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm" />
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Event Category</label>
                      <select required value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm text-slate-700">
                        <option value="" disabled>Select Category</option>
                        <option value="Academic">Academic</option>
                        <option value="Exam">Examination</option>
                        <option value="Activity">Activity & Sports</option>
                        <option value="Holiday">Holiday</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Publication Status</label>
                      <select required value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm text-slate-700">
                        <option value="Upcoming">Published (Upcoming)</option>
                        <option value="Draft">Save as Draft</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Scheduling */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">Scheduling</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</label>
                      <input type="date" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm text-slate-700" />
                    </div>
                    
                    {/* FROM AND TO TIME FIELDS */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Start Time</label>
                      <div className="relative">
                        <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="time" required value={formData.timeFrom} onChange={(e) => setFormData({...formData, timeFrom: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm text-slate-700" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">End Time</label>
                      <div className="relative">
                        <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="time" required value={formData.timeTo} onChange={(e) => setFormData({...formData, timeTo: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm text-slate-700" />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">* For "All Day" events, set time from 12:00 AM to 11:59 PM.</p>
                </div>

                {/* Location & Audience */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">Logistics</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Location / Venue</label>
                      <input type="text" required placeholder="e.g. College Main Ground" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Target Audience</label>
                      <input type="text" required placeholder="e.g. All Students, Grade 10 Parents" value={formData.audience} onChange={(e) => setFormData({...formData, audience: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm" />
                    </div>
                  </div>
                </div>

              </form>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsFormModalOpen(false)} className="px-4 py-2 text-slate-600 text-sm font-medium hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
              <button 
                type="submit" form="event-form" 
                className={`${formMode === 'add' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700'} text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm`}
              >
                {formMode === 'add' ? 'Save Event' : 'Update Event'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}