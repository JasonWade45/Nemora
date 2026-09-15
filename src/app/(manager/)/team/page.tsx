'use client';

import { ManagerLayout } from '@/components/layout/ManagerLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar, AvatarGroup } from '@/components/ui/Avatar';
import { 
  Users, Target, TrendingUp, Clock, CheckCircle, 
  AlertCircle, MapPin, Activity, Calendar, ArrowRight,
  BarChart, Flag
} from 'lucide-react';
import { MOCK_VISITS, MOCK_DOCTORS, MOCK_TARGETS } from '@/lib/mock-data';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isToday } from 'date-fns';
import { useState, useMemo } from 'react';

// Manager's team
const TEAM_MEMBERS = [
  { id: '3', name: 'Emily Chen', email: 'rep1@pharmacorp.com', avatar: 'EC', status: 'active' as const, lastActive: '2 min ago' },
  { id: '4', name: 'Michael Thompson', email: 'rep2@pharmacorp.com', avatar: 'MT', status: 'idle' as const, lastActive: '1 hour ago' },
];

export default function ManagerTeamPage() {
  const [selectedRep, setSelectedRep] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('month');

  const now = new Date();
  const rangeStart = timeRange === 'today' ? new Date(now.setHours(0,0,0,0)) : 
                     timeRange === 'week' ? startOfWeek(now) : 
                     startOfMonth(now);
  const rangeEnd = timeRange === 'today' ? new Date(now.setHours(23,59,59,999)) : 
                   timeRange === 'week' ? endOfWeek(now) : 
                   endOfMonth(now);

  const repStats = useMemo(() => {
    return TEAM_MEMBERS.map(rep => {
      const visits = MOCK_VISITS.filter(v => 
        v.repId === rep.id && 
        new Date(v.startTime) >= rangeStart && 
        new Date(v.startTime) <= rangeEnd
      );
      const completed = visits.filter(v => v.status === 'COMPLETED').length;
      const target = MOCK_TARGETS.find(t => t.repId === rep.id && t.month === now.getMonth() + 1 && t.year === now.getFullYear());
      const targetVisits = target?.totalVisits || 20;
      const achievement = targetVisits > 0 ? Math.round((completed / targetVisits) * 100) : 0;
      const avgDuration = visits.length > 0 ? Math.round(visits.reduce((a, v) => a + (v.duration || 0), 0) / visits.length) : 0;
      const verified = visits.filter(v => v.isVerified).length;

      return { rep, visits: visits.length, completed, achievement, avgDuration, verified, target: targetVisits };
    });
  }, [timeRange]);

  const totalVisits = repStats.reduce((a, b) => a + b.visits, 0);
  const totalCompleted = repStats.reduce((a, b) => a + b.completed, 0);
  const avgAchievement = repStats.length > 0 ? Math.round(repStats.reduce((a, b) => a + b.achievement, 0) / repStats.length) : 0;

  if (selectedRep) {
    const repData = repStats.find(r => r.rep.id === selectedRep);
    if (!repData) return null;

    return (
      <ManagerLayout 
        title={repData.rep.name} 
        subtitle="Individual performance details"
        breadcrumbs={[
          { label: 'Manager', href: '/manager/dashboard' }, 
          { label: 'Team', href: '/manager/team' }, 
          { label: repData.rep.name }
        ]}
      >
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => setSelectedRep(null)}>
          <ArrowRight className="w-4 h-4 mr-1 rotate-180" />
          Back to Team
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card variant="elevated">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-pharma-600">{repData.visits}</p>
              <p className="text-xs text-slate-500">Visits</p>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-success-600">{repData.completed}</p>
              <p className="text-xs text-slate-500">Completed</p>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-slate-900">{repData.achievement}%</p>
              <p className="text-xs text-slate-500">Target Achievement</p>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-warning-600">{repData.avgDuration} min</p>
              <p className="text-xs text-slate-500">Avg Duration</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Visits */}
          <Card variant="elevated">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Visits</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <a href="/manager/visits">View All <ArrowRight className="w-3 h-3 ml-1" /></a>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {MOCK_VISITS
                  .filter(v => v.repId === selectedRep)
                  .slice(0, 10)
                  .map((visit) => {
                    const doctor = MOCK_DOCTORS.find(d => d.id === visit.doctorId);
                    return (
                      <div key={visit.id} className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-pharma-100 flex items-center justify-center">
                              <Flag className="w-4 h-4 text-pharma-600" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 text-sm">{doctor?.name}</p>
                              <p className="text-xs text-slate-500">{doctor?.clinicName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={visit.status === 'COMPLETED' ? 'success' : 'info'} size="sm">
                              {visit.status}
                            </Badge>
                            {visit.isVerified && <Badge variant="success" dot size="sm">Verified</Badge>}
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{format(new Date(visit.startTime), 'MMM d, HH:mm')}</p>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          {/* Target Progress */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Monthly Target Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { label: 'Total Visits', current: repData.completed, target: repData.target, color: 'pharma' },
                  { label: 'Doctors', current: Math.min(repData.completed, repData.target), target: Math.floor(repData.target * 0.75), color: 'success' },
                  { label: 'New Doctors', current: Math.floor(repData.completed * 0.2), target: Math.floor(repData.target * 0.15), color: 'warning' },
                  { label: 'Follow-ups', current: Math.floor(repData.completed * 0.3), target: Math.floor(repData.target * 0.5), color: 'info' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">{item.label}</span>
                      <span className="font-medium text-slate-900">{item.current} / {item.target}</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          item.current >= item.target ? 'bg-success-500' : 
                          item.current >= item.target * 0.75 ? 'bg-pharma-500' : 'bg-warning-500'
                        }`}
                        style={{ width: `${Math.min((item.current / item.target) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </ManagerLayout>
    );
  }

  return (
    <ManagerLayout 
      title="My Team" 
      subtitle="Manage and monitor your medical representatives"
      breadcrumbs={[{ label: 'Manager', href: '/manager/dashboard' }, { label: 'Team' }]}
    >
      {/* Team Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Team Size</p>
                <p className="text-3xl font-bold text-slate-900">{TEAM_MEMBERS.length}</p>
              </div>
              <Users className="w-10 h-10 text-pharma-500" />
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Team Visits ({timeRange})</p>
                <p className="text-3xl font-bold text-pharma-600">{totalVisits}</p>
              </div>
              <Flag className="w-10 h-10 text-pharma-500" />
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Avg Achievement</p>
                <p className="text-3xl font-bold text-success-600">{avgAchievement}%</p>
              </div>
              <TrendingUp className="w-10 h-10 text-success-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2 mb-6">
        {['today', 'week', 'month'].map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range as 'today' | 'week' | 'month')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === range
                ? 'bg-pharma-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {range.charAt(0).toUpperCase() + range.slice(1)}
          </button>
        ))}
      </div>

      {/* Team Members Grid */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {repStats.map(({ rep, visits, completed, achievement, avgDuration, verified, target }) => (
              <button
                key={rep.id}
                onClick={() => setSelectedRep(rep.id)}
                className="w-full p-4 hover:bg-slate-50 transition-colors text-left rounded-lg border border-slate-200"
              >
                <div className="flex items-center gap-4">
                  <Avatar name={rep.name} size="lg" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{rep.name}</h3>
                      <Badge variant={rep.status === 'active' ? 'success' : 'warning'} dot>
                        {rep.status === 'active' ? 'Active' : 'Idle'}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500">{rep.email}</p>
                    <p className="text-xs text-slate-400">Last active: {rep.lastActive}</p>
                  </div>
                  <div className="hidden md:grid grid-cols-4 gap-4 text-center">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xl font-bold text-pharma-600">{visits}</p>
                      <p className="text-xs text-slate-500">Visits</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xl font-bold text-success-600">{completed}</p>
                      <p className="text-xs text-slate-500">Completed</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xl font-bold text-slate-900">{achievement}%</p>
                      <p className="text-xs text-slate-500">Achievement</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xl font-bold text-warning-600">{avgDuration} min</p>
                      <p className="text-xs text-slate-500">Avg Duration</p>
                    </div>
                  </div>
                  <div className="md:hidden grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200 text-center">
                    <div className="p-2 bg-slate-50 rounded">
                      <p className="font-bold text-pharma-600">{visits}</p>
                      <p className="text-xs text-slate-500">Visits</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded">
                      <p className="font-bold text-success-600">{achievement}%</p>
                      <p className="text-xs text-slate-500">Achievement</p>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Live Map */}
      <Card variant="elevated" className="mt-6">
        <CardHeader>
          <CardTitle>Live Team Locations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center relative overflow-hidden">
            <MapPin className="w-12 h-12 text-slate-300" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-slate-500">
                <p className="font-medium">Live Map View</p>
                <p className="text-sm">Real-time GPS tracking</p>
              </div>
            </div>
            {/* Mock markers */}
            <div className="absolute top-1/3 left-1/4 w-3 h-3 bg-pharma-500 rounded-full border-2 border-white animate-pulse" title="Emily Chen - Active" />
            <div className="absolute bottom-1/3 right-1/4 w-3 h-3 bg-warning-500 rounded-full border-2 border-white" title="Michael Thompson - Idle" />
          </div>
          <div className="mt-4 flex items-center justify-center gap-6 text-sm">
            {TEAM_MEMBERS.map(member => (
              <div key={member.id} className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${member.status === 'active' ? 'bg-success-500 animate-pulse' : 'bg-warning-500'}`} />
                <span className="font-medium">{member.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </ManagerLayout>
  );
}