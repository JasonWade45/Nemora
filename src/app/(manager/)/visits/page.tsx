'use client';

import { ManagerLayout } from '@/components/layout/ManagerLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/Tabs';
import { 
  Calendar, Clock, CheckCircle, AlertCircle, Filter, 
  Search, MapPin, Download, Flag, Eye, Map
} from 'lucide-react';
import { MOCK_VISITS, MOCK_DOCTORS, MOCK_REPS, VISIT_STATUS_LABELS, VISIT_STATUS_COLORS, VISIT_PURPOSE_LABELS } from '@/lib/mock-data';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isToday, subDays } from 'date-fns';
import { useState, useMemo } from 'react';

const TEAM_REP_IDS = ['3', '4'];

export default function ManagerVisitsPage() {
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [repFilter, setRepFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress' | 'cancelled'>('all');

  const teamVisits = MOCK_VISITS.filter(v => TEAM_REP_IDS.includes(v.repId));

  const filteredVisits = useMemo(() => {
    const now = new Date();
    let visits = teamVisits;

    // Time filter
    switch (activeTab) {
      case 'today':
        visits = visits.filter(v => isToday(new Date(v.startTime)));
        break;
      case 'week':
        visits = visits.filter(v => {
          const date = new Date(v.startTime);
          return date >= startOfWeek(now) && date <= endOfWeek(now);
        });
        break;
      case 'month':
        visits = visits.filter(v => {
          const date = new Date(v.startTime);
          return date >= startOfMonth(now) && date <= endOfMonth(now);
        });
        break;
    }

    // Search filter
    if (searchQuery) {
      visits = visits.filter(v => {
        const doctor = MOCK_DOCTORS.find(d => d.id === v.doctorId);
        const rep = MOCK_REPS.find(r => r.id === v.repId);
        return doctor?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
               doctor?.clinicName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
               rep?.name.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }

    // Rep filter
    if (repFilter) {
      visits = visits.filter(v => v.repId === repFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      visits = visits.filter(v => v.status.toLowerCase().replace('_', ' ') === statusFilter.replace('_', ' '));
    }

    return visits.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [teamVisits, activeTab, searchQuery, repFilter, statusFilter]);

  const stats = {
    today: teamVisits.filter(v => isToday(new Date(v.startTime))).length,
    week: teamVisits.filter(v => {
      const date = new Date(v.startTime);
      return date >= startOfWeek(new Date()) && date <= endOfWeek(new Date());
    }).length,
    month: teamVisits.filter(v => {
      const date = new Date(v.startTime);
      return date >= startOfMonth(new Date()) && date <= endOfMonth(new Date());
    }).length,
    completed: teamVisits.filter(v => v.status === 'COMPLETED').length,
    inProgress: teamVisits.filter(v => v.status === 'IN_PROGRESS').length,
  };

  return (
    <ManagerLayout 
      title="Team Visits" 
      subtitle="Monitor and manage all team visit activities"
      headerActions={
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-1" />
          Export
        </Button>
      }
      breadcrumbs={[{ label: 'Manager', href: '/manager/dashboard' }, { label: 'Visits' }]}
    >
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card variant="elevated">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-pharma-600">{stats.today}</p>
            <p className="text-xs text-slate-500">Today</p>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{stats.week}</p>
            <p className="text-xs text-slate-500">This Week</p>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{stats.month}</p>
            <p className="text-xs text-slate-500">This Month</p>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-success-600">{stats.completed}</p>
            <p className="text-xs text-slate-500">Completed</p>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-pharma-600">{stats.inProgress}</p>
            <p className="text-xs text-slate-500">In Progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card variant="elevated" className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <Input
              placeholder="Search visits, doctors, reps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-5 h-5" />}
              className="max-w-xs sm:max-w-md flex-1"
            />
            <div className="flex flex-wrap gap-3 w-full sm:w-auto">
              <Select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as 'today' | 'week' | 'month' | 'all')}
                options={[
                  { value: 'today', label: `Today (${stats.today})` },
                  { value: 'week', label: `Week (${stats.week})` },
                  { value: 'month', label: `Month (${stats.month})` },
                  { value: 'all', label: `All (${teamVisits.length})` },
                ]}
                className="w-36"
              />
              <Select
                value={repFilter}
                onChange={(e) => setRepFilter(e.target.value)}
                options={[
                  { value: '', label: 'All Reps' },
                  ...MOCK_REPS.filter(r => TEAM_REP_IDS.includes(r.id)).map(r => ({ value: r.id, label: r.name }))
                ]}
                className="w-40"
              />
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'completed' | 'in_progress' | 'cancelled')}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
                className="w-36"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Map for In-Progress Visits */}
      {filteredVisits.some(v => v.status === 'IN_PROGRESS') && (
        <Card variant="elevated" className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Live Visits Map</CardTitle>
            <Badge variant="info" dot>{filteredVisits.filter(v => v.status === 'IN_PROGRESS').length} Active</Badge>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center relative overflow-hidden">
              <Map className="w-12 h-12 text-slate-300" />
              <div className="absolute inset-0">
                {filteredVisits
                  .filter(v => v.status === 'IN_PROGRESS')
                  .map((visit, i) => {
                    const doctor = MOCK_DOCTORS.find(d => d.id === visit.doctorId);
                    const rep = MOCK_REPS.find(r => r.id === visit.repId);
                    return (
                      <div
                        key={visit.id}
                        className="absolute w-3 h-3 bg-pharma-500 rounded-full border-2 border-white animate-pulse"
                        style={{ 
                          top: `${20 + (i * 15)}%`, 
                          left: `${20 + (i * 20)}%` 
                        }}
                        title={`${rep?.name} visiting ${doctor?.name}`}
                      />
                    );
                  })}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {filteredVisits
                .filter(v => v.status === 'IN_PROGRESS')
                .map((visit) => {
                  const doctor = MOCK_DOCTORS.find(d => d.id === visit.doctorId);
                  const rep = MOCK_REPS.find(r => r.id === visit.repId);
                  return (
                    <Badge key={visit.id} variant="info" dot className="text-xs">
                      {rep?.name} → {doctor?.name}
                    </Badge>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Visits Table */}
      <Card variant="elevated">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rep</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Doctor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Clinic</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Purpose</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">GPS</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredVisits.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center">
                      <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">No visits found</p>
                    </td>
                  </tr>
                ) : (
                  filteredVisits.map((visit) => {
                    const doctor = MOCK_DOCTORS.find(d => d.id === visit.doctorId);
                    const rep = MOCK_REPS.find(r => r.id === visit.repId);
                    return (
                      <tr key={visit.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-slate-900">{format(new Date(visit.startTime), 'MMM d, yyyy')}</p>
                            <p className="text-sm text-slate-500">{format(new Date(visit.startTime), 'HH:mm')}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-pharma-100 flex items-center justify-center">
                              <span className="text-xs font-medium text-pharma-600">{rep?.name.split(' ').map((n: string) => n[0]).join('')}</span>
                            </div>
                            <span className="text-sm text-slate-700">{rep?.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-900">{doctor?.name}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-700">{doctor?.clinicName}</p>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" size="sm">{visit.visitPurpose.replace('_', ' ')}</Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={visit.status === 'COMPLETED' ? 'success' : visit.status === 'IN_PROGRESS' ? 'info' : 'danger'}>
                            {VISIT_STATUS_LABELS[visit.status]}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-700">{visit.duration || 0} min</span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={visit.isVerified ? 'success' : visit.status === 'IN_PROGRESS' ? 'warning' : 'default'} dot size="sm">
                            {visit.isVerified ? 'Verified' : visit.status === 'IN_PROGRESS' ? 'Tracking' : 'N/A'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-700">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-pharma-600">
                              <MapPin className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing {filteredVisits.length} of {teamVisits.length} visits
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