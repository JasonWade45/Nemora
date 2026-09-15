'use client';

import { ManagerLayout } from '@/components/layout/ManagerLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { 
  FileText, Download, BarChart, PieChart, TrendingUp,
  Users, MapPin, Target, Calendar, Clock, CheckCircle,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { MOCK_VISITS, MOCK_DOCTORS, MOCK_REPS, MOCK_TARGETS } from '@/lib/mock-data';
import { format, startOfMonth, endOfMonth, subMonths, subDays, isToday } from 'date-fns';
import { useState, useMemo } from 'react';

const TEAM_REP_IDS = ['3', '4'];

export default function ManagerReportsPage() {
  const [reportType, setReportType] = useState<'overview' | 'team' | 'visits' | 'coverage'>('overview');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter'>('month');

  const now = new Date();
  const periodStart = dateRange === 'week' ? subDays(now, 7) : 
                      dateRange === 'month' ? startOfMonth(now) : 
                      subMonths(now, 3);
  const periodEnd = endOfMonth(now);

  const teamVisits = MOCK_VISITS.filter(v => TEAM_REP_IDS.includes(v.repId));
  const periodVisits = teamVisits.filter(v => {
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
    completionRate: periodVisits.length > 0 ? Math.round((periodVisits.filter(v => v.status === 'COMPLETED').length / periodVisits.length) * 100) : 0,
  }), [periodVisits]);

  const repPerformance = useMemo(() => {
    return TEAM_REP_IDS.map(repId => {
      const rep = MOCK_REPS.find(r => r.id === repId);
      const visits = periodVisits.filter(v => v.repId === repId);
      const completed = visits.filter(v => v.status === 'COMPLETED').length;
      const target = MOCK_TARGETS.find(t => t.repId === repId && t.month === now.getMonth() + 1 && t.year === now.getFullYear());
      const targetVisits = target?.totalVisits || 20;
      const achievement = targetVisits > 0 ? Math.round((completed / targetVisits) * 100) : 0;
      const avgDur = visits.length > 0 ? Math.round(visits.reduce((a, v) => a + (v.duration || 0), 0) / visits.length) : 0;
      const verified = visits.filter(v => v.isVerified).length;
      
      return {
        repId,
        repName: rep?.name ?? 'Unknown Rep',
        visits: visits.length,
        completed,
        achievement,
        avgDur,
        verified,
        target: targetVisits,
      };
    });
  }, [periodVisits]);

  return (
    <ManagerLayout 
      title="Team Reports" 
      subtitle="Analyze your team's field performance"
      headerActions={
        <div className="flex items-center gap-2">
          <Select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as 'week' | 'month' | 'quarter')}
            options={[
              { value: 'week', label: 'Last 7 Days' },
              { value: 'month', label: 'This Month' },
              { value: 'quarter', label: 'This Quarter' },
            ]}
            className="w-36"
          />
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      }
      breadcrumbs={[{ label: 'Manager', href: '/manager/dashboard' }, { label: 'Reports' }]}
    >
      {/* Report Type Tabs */}
      <div className="mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { value: 'overview', label: 'Overview', icon: BarChart },
            { value: 'team', label: 'Team Performance', icon: Users },
            { value: 'visits', label: 'Visit Analytics', icon: Calendar },
            { value: 'coverage', label: 'Coverage', icon: MapPin },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setReportType(value as 'overview' | 'team' | 'visits' | 'coverage')}
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

      {/* KPI Cards */}
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
                <p className="text-sm text-slate-500">Completion Rate</p>
                <p className="text-2xl font-bold text-success-600">{stats.completionRate}%</p>
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
          {/* Visit Purpose Distribution */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Visits by Purpose</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['DETAILING', 'FOLLOW_UP', 'PRODUCT_LAUNCH', 'SAMPLE_DELIVERY', 'MEDICAL_EDUCATION', 'RELATIONSHIP_BUILDING'].map(purpose => {
                  const count = periodVisits.filter(v => v.visitPurpose === purpose).length;
                  return (
                    <div key={purpose} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-pharma-100 flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-pharma-600" />
                        </div>
                        <span className="font-medium text-slate-900">{purpose.replace('_', ' ')}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-pharma-500 rounded-full" style={{ width: `${stats.totalVisits > 0 ? (count / stats.totalVisits) * 100 : 0}%` }} />
                        </div>
                        <span className="text-sm font-medium text-slate-900 w-12 text-right">{count}</span>
                      </div>
                    </div>
                  );
                })}
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
                {['VERY_INTERESTED', 'INTERESTED', 'NEUTRAL', 'NOT_INTERESTED'].map(response => {
                  const count = periodVisits.filter(v => v.doctorResponse === response).length;
                  const total = periodVisits.filter(v => v.doctorResponse).length;
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
                          <div className={`h-full rounded-full ${color === 'success' ? 'bg-success-500' : color === 'info' ? 'bg-pharma-500' : color === 'warning' ? 'bg-warning-500' : 'bg-danger-500'}`} style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }} />
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
              <CardTitle>Daily Visit Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end justify-around gap-1 px-2">
                {Array.from({ length: 14 }, (_, i) => {
                  const day = subDays(now, 13 - i);
                  const count = periodVisits.filter(v => isToday(new Date(v.startTime)) || format(new Date(v.startTime), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')).length;
                  const maxCount = Math.max(...Array.from({ length: 14 }, (_, j) => {
                    const d = subDays(now, 13 - j);
                    return periodVisits.filter(v => format(new Date(v.startTime), 'yyyy-MM-dd') === format(d, 'yyyy-MM-dd')).length;
                  }));
                  return (
                    <div key={i} className="flex flex-col items-center flex-1">
                      <div 
                        className="w-full bg-pharma-500 rounded-t transition-all hover:bg-pharma-600 cursor-pointer"
                        style={{ height: maxCount > 0 ? `${(count / maxCount) * 100}%` : '4px' }}
                        title={`${format(day, 'MMM d')} - ${count} visits`}
                      />
                      <span className="text-xs text-slate-500 mt-2">{format(day, 'MMM d')}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {reportType === 'team' && (
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Team Member Performance</CardTitle>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {repPerformance.map((p) => (
                    <tr key={p.repId} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-pharma-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-pharma-600">{p.repName.split(' ').map((n: string) => n[0]).join('')}</span>
                          </div>
                          <span className="font-medium text-slate-900">{p.repName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">{p.visits}</td>
                      <td className="px-6 py-4 text-sm text-success-600">{p.completed}</td>
                      <td className="px-6 py-4">
                        <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${p.completed / p.visits >= 0.8 ? 'bg-success-500' : p.completed / p.visits >= 0.5 ? 'bg-pharma-500' : 'bg-warning-500'}`} style={{ width: `${p.visits > 0 ? (p.completed / p.visits) * 100 : 0}%` }} />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">{p.avgDur} min</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{p.visits > 0 ? Math.round((p.verified / p.visits) * 100) : 0}%</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{p.target}</td>
                      <td className="px-6 py-4">
                        <Badge variant={p.achievement >= 100 ? 'success' : p.achievement >= 75 ? 'info' : p.achievement >= 50 ? 'warning' : 'danger'}>
                          {p.achievement}%
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        {p.achievement >= 100 ? (
                          <span className="flex items-center gap-1 text-success-600"><ArrowUpRight className="w-4 h-4" /> On Track</span>
                        ) : p.achievement >= 75 ? (
                          <span className="flex items-center gap-1 text-pharma-600"><ArrowUpRight className="w-4 h-4" /> Good</span>
                        ) : (
                          <span className="flex items-center gap-1 text-warning-600"><ArrowDownRight className="w-4 h-4" /> Behind</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">GPS Verified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {periodVisits.slice(0, 50).map((visit) => {
                    const rep = MOCK_REPS.find(r => r.id === visit.repId);
                    const doctor = MOCK_DOCTORS.find(d => d.id === visit.doctorId);
                    return (
                      <tr key={visit.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm text-slate-700">{format(new Date(visit.startTime), 'MMM d, HH:mm')}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{rep?.name}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{doctor?.name}</td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" size="sm">{visit.visitPurpose.replace('_', ' ')}</Badge>
                        </td>
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

      {reportType === 'coverage' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Territory Coverage */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Territory Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500 mb-4">Doctors visited vs total in territory</p>
              <div className="space-y-4">
                {['San Francisco', 'Palo Alto', 'Mountain View', 'Oakland', 'San Jose', 'Redwood City'].map(city => {
                  const cityDoctors = MOCK_DOCTORS.filter(d => d.city === city);
                  const visited = new Set(periodVisits.filter(v => {
                    const d = MOCK_DOCTORS.find(doc => doc.id === v.doctorId);
                    return d?.city === city;
                  }).map(v => v.doctorId)).size;
                  const total = cityDoctors.length;
                  const pct = total > 0 ? Math.round((visited / total) * 100) : 0;
                  return (
                    <div key={city} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-slate-900">{city}</span>
                        <span className="text-sm font-medium text-slate-700">{visited} / {total} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pct >= 80 ? 'bg-success-500' : pct >= 50 ? 'bg-pharma-500' : pct >= 25 ? 'bg-warning-500' : 'bg-danger-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Priority Coverage */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Priority Doctor Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['A', 'B', 'C'].map(priority => {
                  const priorityDoctors = MOCK_DOCTORS.filter(d => d.priority === priority);
                  const visited = new Set(periodVisits.filter(v => {
                    const d = MOCK_DOCTORS.find(doc => doc.id === v.doctorId);
                    return d?.priority === priority;
                  }).map(v => v.doctorId)).size;
                  const total = priorityDoctors.length;
                  const pct = total > 0 ? Math.round((visited / total) * 100) : 0;
                  return (
                    <div key={priority} className="p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Badge variant={priority === 'A' ? 'danger' : priority === 'B' ? 'warning' : 'success'}>
                            Priority {priority}
                          </Badge>
                          <span className="font-medium text-slate-900">{total} doctors in territory</span>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-slate-900">{visited} / {total}</p>
                          <p className="text-sm text-slate-500">{pct}% covered</p>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pct >= 80 ? 'bg-success-500' : pct >= 50 ? 'bg-pharma-500' : pct >= 25 ? 'bg-warning-500' : 'bg-danger-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </ManagerLayout>
  );
}