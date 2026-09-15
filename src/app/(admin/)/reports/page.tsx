'use client';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { 
  FileText, Download, BarChart, PieChart, TrendingUp,
  Users, MapPin, Target, Calendar, Clock, CheckCircle
} from 'lucide-react';
import { MOCK_VISITS, MOCK_DOCTORS, MOCK_REPS, MOCK_TARGETS } from '@/lib/mock-data';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useState, useMemo } from 'react';

export default function AdminReportsPage() {
  const [reportType, setReportType] = useState<'overview' | 'visits' | 'coverage' | 'performance'>('overview');
  const [dateRange, setDateRange] = useState<'month' | 'quarter' | 'year'>('month');

  const now = new Date();
  const periodStart = dateRange === 'month' ? startOfMonth(now) : 
                      dateRange === 'quarter' ? startOfMonth(subMonths(now, 3)) : 
                      new Date(now.getFullYear(), 0, 1);
  const periodEnd = endOfMonth(now);

  const periodVisits = MOCK_VISITS.filter(v => {
    const date = new Date(v.startTime);
    return date >= periodStart && date <= periodEnd;
  });

  const stats = useMemo(() => ({
    totalVisits: periodVisits.length,
    completed: periodVisits.filter(v => v.status === 'COMPLETED').length,
    uniqueDoctors: new Set(periodVisits.map(v => v.doctorId)).size,
    uniqueReps: new Set(periodVisits.map(v => v.repId)).size,
    avgDuration: periodVisits.length > 0 
      ? Math.round(periodVisits.reduce((a, v) => a + (v.duration || 0), 0) / periodVisits.length) 
      : 0,
    verified: periodVisits.filter(v => v.isVerified).length,
    byPurpose: periodVisits.reduce((acc, v) => {
      acc[v.visitPurpose] = (acc[v.visitPurpose] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byResponse: periodVisits.reduce((acc, v) => {
      if (v.doctorResponse) acc[v.doctorResponse] = (acc[v.doctorResponse] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  }), [periodVisits]);

  return (
    <AdminLayout 
      title="Reports & Analytics" 
      subtitle="Comprehensive insights into field force performance"
      headerActions={
        <div className="flex items-center gap-2">
          <Select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as 'month' | 'quarter' | 'year')}
            options={[
              { value: 'month', label: 'This Month' },
              { value: 'quarter', label: 'This Quarter' },
              { value: 'year', label: 'This Year' },
            ]}
            className="w-40"
          />
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      }
      breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Reports' }]}
    >
      {/* Report Type Tabs */}
      <div className="mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { value: 'overview', label: 'Overview', icon: BarChart },
            { value: 'visits', label: 'Visit Analytics', icon: Calendar },
            { value: 'coverage', label: 'Territory Coverage', icon: MapPin },
            { value: 'performance', label: 'Rep Performance', icon: Users },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setReportType(value as 'overview' | 'visits' | 'coverage' | 'performance')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                reportType === value
                  ? 'bg-pharma-50 text-pharma-700 border border-pharma-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <Card variant="elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Visits</p>
                <p className="text-2xl font-bold text-slate-900">{stats.totalVisits}</p>
              </div>
              <BarChart className="w-8 h-8 text-pharma-500" />
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Completed</p>
                <p className="text-2xl font-bold text-success-600">{stats.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-success-500" />
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Doctors Covered</p>
                <p className="text-2xl font-bold text-slate-900">{stats.uniqueDoctors}</p>
              </div>
              <Users className="w-8 h-8 text-pharma-500" />
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Active Reps</p>
                <p className="text-2xl font-bold text-slate-900">{stats.uniqueReps}</p>
              </div>
              <Target className="w-8 h-8 text-pharma-500" />
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Avg Duration</p>
                <p className="text-2xl font-bold text-slate-900">{stats.avgDuration} min</p>
              </div>
              <Clock className="w-8 h-8 text-pharma-500" />
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">GPS Verified</p>
                <p className="text-2xl font-bold text-success-600">{stats.verified}</p>
              </div>
              <MapPin className="w-8 h-8 text-success-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Content */}
      {reportType === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Visits by Purpose */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Visits by Purpose</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(stats.byPurpose).map(([purpose, count]) => (
                  <div key={purpose} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-pharma-100 flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-pharma-600" />
                      </div>
                      <span className="font-medium text-slate-900">{purpose.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-pharma-500 rounded-full" 
                          style={{ width: `${(count / stats.totalVisits) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-slate-900 w-12 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Doctor Response */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Doctor Response Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(stats.byResponse).map(([response, count]) => {
                  const colors: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
                    VERY_INTERESTED: 'success',
                    INTERESTED: 'info',
                    NEUTRAL: 'warning',
                    NOT_INTERESTED: 'danger',
                  };
                  const color = colors[response] ?? 'info';
                  return (
                    <div key={response} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant={color} dot>
                          {response.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              color === 'success' ? 'bg-success-500' :
                              color === 'info' ? 'bg-pharma-500' :
                              color === 'warning' ? 'bg-warning-500' : 'bg-danger-500'
                            }`}
                            style={{ width: `${(count / Object.values(stats.byResponse).reduce((a,b) => a+b, 0)) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-slate-900 w-12 text-right">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Weekly Trend */}
          <Card variant="elevated" className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Weekly Visit Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end justify-around gap-2 px-4">
                {Array.from({ length: 8 }, (_, i) => {
                  const weekStart = subMonths(now, 1);
                  weekStart.setDate(weekStart.getDate() + i * 7);
                  const weekEnd = new Date(weekStart);
                  weekEnd.setDate(weekEnd.getDate() + 6);
                  const count = periodVisits.filter(v => {
                    const d = new Date(v.startTime);
                    return d >= weekStart && d <= weekEnd;
                  }).length;
                  const maxCount = Math.max(...Array.from({ length: 8 }, (_, j) => {
                    const ws = subMonths(now, 1);
                    ws.setDate(ws.getDate() + j * 7);
                    const we = new Date(ws);
                    we.setDate(we.getDate() + 6);
                    return periodVisits.filter(v => {
                      const d = new Date(v.startTime);
                      return d >= ws && d <= we;
                    }).length;
                  }));
                  return (
                    <div key={i} className="flex flex-col items-center flex-1">
                      <div 
                        className="w-full bg-pharma-500 rounded-t transition-all hover:bg-pharma-600"
                        style={{ height: maxCount > 0 ? `${(count / maxCount) * 100}%` : '0%' }}
                        title={`${format(weekStart, 'MMM d')} - ${count} visits`}
                      />
                      <span className="text-xs text-slate-500 mt-2">{format(weekStart, 'MMM d')}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {reportType === 'visits' && (
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Visit Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Rep</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Doctor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Purpose</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Verified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {periodVisits.slice(0, 20).map((visit) => {
                    const rep = MOCK_REPS.find(r => r.id === visit.repId);
                    const doctor = MOCK_DOCTORS.find(d => d.id === visit.doctorId);
                    return (
                      <tr key={visit.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm text-slate-700">{format(new Date(visit.startTime), 'MMM d, HH:mm')}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{rep?.name}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{doctor?.name}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{visit.visitPurpose.replace('_', ' ')}</td>
                        <td className="px-6 py-4">
                          <Badge variant={visit.status === 'COMPLETED' ? 'success' : visit.status === 'IN_PROGRESS' ? 'info' : 'default'}>
                            {visit.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">{visit.duration || 0} min</td>
                        <td className="px-6 py-4">
                          <Badge variant={visit.isVerified ? 'success' : 'warning'} dot size="sm">
                            {visit.isVerified ? 'Verified' : 'Pending'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {reportType === 'performance' && (
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Rep Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Rep</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Visits</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Completed</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Completion %</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Avg Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Verified %</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Target</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Achievement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {MOCK_REPS.map((rep) => {
                    const repVisits = periodVisits.filter(v => v.repId === rep.id);
                    const completed = repVisits.filter(v => v.status === 'COMPLETED').length;
                    const completionRate = repVisits.length > 0 ? Math.round((completed / repVisits.length) * 100) : 0;
                    const avgDur = repVisits.length > 0 ? Math.round(repVisits.reduce((a, v) => a + (v.duration || 0), 0) / repVisits.length) : 0;
                    const verified = repVisits.filter(v => v.isVerified).length;
                    const verifiedRate = repVisits.length > 0 ? Math.round((verified / repVisits.length) * 100) : 0;
                    const target = MOCK_TARGETS.find(t => t.repId === rep.id && t.month === now.getMonth() + 1 && t.year === now.getFullYear());
                    const targetVisits = target?.totalVisits || 0;
                    const achievement = targetVisits > 0 ? Math.round((completed / targetVisits) * 100) : 0;
                    
                    return (
                      <tr key={rep.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-pharma-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-pharma-600">{rep.name.split(' ').map((n: string) => n[0]).join('')}</span>
                            </div>
                            <span className="font-medium text-slate-900">{rep.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">{repVisits.length}</td>
                        <td className="px-6 py-4 text-sm text-success-600">{completed}</td>
                        <td className="px-6 py-4">
                          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${completionRate >= 80 ? 'bg-success-500' : completionRate >= 50 ? 'bg-pharma-500' : 'bg-warning-500'}`} style={{ width: `${completionRate}%` }} />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">{avgDur} min</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{verifiedRate}%</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{targetVisits}</td>
                        <td className="px-6 py-4">
                          <Badge variant={achievement >= 100 ? 'success' : achievement >= 75 ? 'info' : achievement >= 50 ? 'warning' : 'danger'}>
                            {achievement}%
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </AdminLayout>
  );
}