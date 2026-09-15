'use client';

import { ManagerLayout } from '@/components/layout/ManagerLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { 
  Users, Search, Filter, MapPin, Building2, 
  Target, Calendar, Clock, MapPin as MapPinIcon
} from 'lucide-react';
import { MOCK_DOCTORS, MOCK_SPECIALTIES, PRIORITY_COLORS } from '@/lib/mock-data';
import { format } from 'date-fns';
import { useState, useMemo } from 'react';

export default function ManagerDoctorsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const cities = useMemo(() => [...new Set(MOCK_DOCTORS.map(d => d.city).filter(Boolean))], []);

  const filteredDoctors = useMemo(() => {
    return MOCK_DOCTORS
      .filter(doc => {
        if (searchQuery && !doc.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !doc.clinicName?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (specialtyFilter && doc.specialtyId !== specialtyFilter) return false;
        if (priorityFilter && doc.priority !== priorityFilter) return false;
        if (cityFilter && doc.city !== cityFilter) return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [searchQuery, specialtyFilter, priorityFilter, cityFilter]);

  // Stats
  const stats = {
    total: MOCK_DOCTORS.length,
    priorityA: MOCK_DOCTORS.filter(d => d.priority === 'A').length,
    priorityB: MOCK_DOCTORS.filter(d => d.priority === 'B').length,
    priorityC: MOCK_DOCTORS.filter(d => d.priority === 'C').length,
    withCoords: MOCK_DOCTORS.filter(d => d.latitude && d.longitude).length,
  };

  return (
    <ManagerLayout 
      title="Doctors Database" 
      subtitle="View and manage doctors in your team's territory"
      breadcrumbs={[{ label: 'Manager', href: '/manager/dashboard' }, { label: 'Doctors' }]}
    >
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card variant="elevated">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-xs text-slate-500">Total Doctors</p>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-danger-600">{stats.priorityA}</p>
            <p className="text-xs text-slate-500">Priority A</p>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-warning-600">{stats.priorityB}</p>
            <p className="text-xs text-slate-500">Priority B</p>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-success-600">{stats.priorityC}</p>
            <p className="text-xs text-slate-500">Priority C</p>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-pharma-600">{stats.withCoords}</p>
            <p className="text-xs text-slate-500">Mapped</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Card variant="elevated" className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <Input
              placeholder="Search doctors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-5 h-5" />}
              className="max-w-xs sm:max-w-md flex-1"
            />
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="w-4 h-4 mr-1" />
              Filters
            </Button>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-slide-up">
              <Select
                label="Specialty"
                placeholder="All Specialties"
                value={specialtyFilter}
                onChange={(e) => setSpecialtyFilter(e.target.value)}
                options={[
                  { value: '', label: 'All Specialties' },
                  ...MOCK_SPECIALTIES.map(s => ({ value: s.id, label: s.name }))
                ]}
              />
              <Select
                label="Priority"
                placeholder="All Priorities"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                options={[
                  { value: '', label: 'All Priorities' },
                  { value: 'A', label: 'A - High' },
                  { value: 'B', label: 'B - Medium' },
                  { value: 'C', label: 'C - Low' },
                ]}
              />
              <Select
                label="City"
                placeholder="All Cities"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                options={[
                  { value: '', label: 'All Cities' },
                  ...cities.map(c => ({ value: c!, label: c! }))
                ]}
              />
              <div className="flex items-end">
                <Button variant="ghost" size="sm" onClick={() => {
                  setSearchQuery(''); setSpecialtyFilter(''); setPriorityFilter(''); setCityFilter('');
                }}>
                  Clear
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Doctors Table */}
      <Card variant="elevated">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Doctor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Specialty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Clinic</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Coordinates</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredDoctors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">No doctors found</p>
                      <p className="text-sm text-slate-400 mt-1">Try adjusting your filters</p>
                    </td>
                  </tr>
                ) : (
                  filteredDoctors.map((doctor) => (
                    <tr key={doctor.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-900">{doctor.name}</p>
                          <p className="text-sm text-slate-500">{doctor.phone || 'No phone'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-700">{doctor.specialty?.name}</span>
                        {doctor.subSpecialty && (
                          <p className="text-xs text-slate-400">{doctor.subSpecialty}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">{doctor.clinicName}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-700 flex items-center gap-1">
                          <MapPinIcon className="w-3 h-3" />
                          {doctor.city}, {doctor.governorate}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={PRIORITY_COLORS[doctor.priority].includes('red') ? 'danger' : PRIORITY_COLORS[doctor.priority].includes('yellow') ? 'warning' : 'success'}>
                          {doctor.priority}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        {doctor.latitude && doctor.longitude ? (
                          <span className="text-sm font-mono text-slate-600">
                            {doctor.latitude.toFixed(4)}, {doctor.longitude.toFixed(4)}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">Not mapped</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="text-slate-500 hover:text-pharma-600">
                            <MapPin className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-700">
                            <Target className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing {filteredDoctors.length} of {MOCK_DOCTORS.length} doctors
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled>Previous</Button>
              <Button variant="outline" size="sm" disabled>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </ManagerLayout>
  );
}