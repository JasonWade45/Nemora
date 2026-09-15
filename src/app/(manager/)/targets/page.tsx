'use client';

import { ManagerLayout } from '@/components/layout/ManagerLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { 
  Target, TrendingUp, AlertCircle, CheckCircle, 
  Users, Clock, Flag, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { MOCK_TARGETS, MOCK_REPS, MOCK_VISITS } from '@/lib/mock-data';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useState, useMemo } from 'react';

const TEAM_REP_IDS = ['3', '4'];

export default function ManagerTargetsPage() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = [2024, 2025, 2026];

  const teamTargets = useMemo(() => {
    return MOCK_TARGETS
      .filter(t => TEAM_REP_IDS.includes(t.repId) && t.month === month && t.year === year)
      .map(t => {
        const rep = MOCK_REPS.find(r => r.id === t.repId);
        const visits = MOCK_VISITS.filter(v => 
          v.repId === t.repId && 
          new Date(v.startTime) >= startOfMonth(new Date(year, month - 1)) && 
          new Date(v.startTime) <= endOfMonth(new Date(year, month - 1))
        );
        const completed = visits.filter(v => v.status === 'COMPLETED').length;
        const totalTarget = t.totalVisits;
        const achievement = totalTarget > 0 ? Math.round((completed / totalTarget) * 100) : 0;
        
        return { ...t, repName: rep?.name || 'Unknown', completed, achievement, visits: visits.length };
      });
  }, [month, year]);

  const totals = useMemo(() => ({
    target: teamTargets.reduce((a, b) => a + b.totalVisits, 0),
    completed: teamTargets.reduce((a, b) => a + b.completed, 0),
    doctors: teamTargets.reduce((a, b) => a + b.totalDoctors, 0),
    newDoctors: teamTargets.reduce((a, b) => a + b.newDoctors, 0),
    followUps: teamTargets.reduce((a, b) => a + b.followUps, 0),
  }), [teamTargets]);

  const overallAchievement = totals.target > 0 ? Math.round((totals.completed / totals.target) * 100) : 0;

  return (
    <ManagerLayout 
      title="Team Targets" 
      subtitle="Track monthly KPI targets for your team"
      breadcrumbs={[{ label: 'Manager', href: '/manager/dashboard' }, { label: 'Targets' }]}
    >
      {/* Period Selector */}
      <Card variant="elevated" className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex gap-3">
              <Select
                label="Month"
                value={month.toString()}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                options={months.map(m => ({ value: m.toString(), label: format(new Date(2024, m-1), 'MMMM') }))}
                className="w-40"
              />
              <Select
                label="Year"
                value={year.toString()}
                onChange={(e) => setYear(parseInt(e.target.value))}
                options={years.map(y => ({ value: y.toString(), label: y.toString() }))}
                className="w-28"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-500">Team Target</p>
                <p className="font-bold text-slate-900">{totals.target} visits</p>
              </div>
              <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${overallAchievement >= 100 ? 'bg-success-500' : overallAchievement >= 75 ? 'bg-pharma-500' : 'bg-warning-500'}`}
                  style={{ width: `${Math.min(overallAchievement, 100)}%` }}
                />
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Achievement</p>
                <p className="font-bold text-slate-900">{overallAchievement}%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card variant="elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Visits</p>
                <p className="text-2xl font-bold text-pharma-600">{totals.completed} / {totals.target}</p>
              </div>
              <Flag className="w-8 h-8 text-pharma-500" />
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Doctors Target</p>
                <p className="text-2xl font-bold text-slate-900">{totals.doctors}</p>
              </div>
              <Users className="w-8 h-8 text-slate-500" />
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">New Doctors</p>
                <p className="text-2xl font-bold text-success-600">{totals.newDoctors}</p>
              </div>
              <ArrowUpRight className="w-8 h-8 text-success-500" />
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Follow-ups</p>
                <p className="text-2xl font-bold text-warning-600">{totals.followUps}</p>
              </div>
              <Clock className="w-8 h-8 text-warning-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Individual Targets */}
      <Card variant="elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Individual Targets</CardTitle>
          <Button variant="outline" size="sm">
            Export Report
          </Button>
        </CardHeader>
        <CardContent>
          {teamTargets.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No targets set for this period</p>
              <p className="text-sm text-slate-400 mt-1">Targets are managed by Admin</p>
            </div>
          ) : (
            <div className="space-y-4">
              {teamTargets.map((target) => {
                const progressColor = target.achievement >= 100 ? 'success' : target.achievement >= 75 ? 'pharma' : target.achievement >= 50 ? 'warning' : 'danger';
                const badgeVariant: 'success' | 'info' | 'warning' | 'danger' =
                  target.achievement >= 100 ? 'success' : target.achievement >= 75 ? 'info' : target.achievement >= 50 ? 'warning' : 'danger';

                return (
                  <div key={target.id} className="p-4 hover:bg-slate-50 transition-colors rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-pharma-100 flex items-center justify-center">
                          <Target className="w-6 h-6 text-pharma-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{target.repName}</h3>
                          <p className="text-sm text-slate-500">Medical Representative</p>
                        </div>
                      </div>

                      <div className="hidden md:grid grid-cols-5 gap-4 text-center flex-1">
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-xl font-bold text-pharma-600">{target.completed}</p>
                          <p className="text-xs text-slate-500">Completed</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-xl font-bold text-slate-900">{target.totalVisits}</p>
                          <p className="text-xs text-slate-500">Target</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-xl font-bold text-slate-900">{target.totalDoctors}</p>
                          <p className="text-xs text-slate-500">Doctors</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-xl font-bold text-success-600">{target.newDoctors}</p>
                          <p className="text-xs text-slate-500">New</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-xl font-bold text-warning-600">{target.followUps}</p>
                          <p className="text-xs text-slate-500">Follow-ups</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 md:flex-row md:items-center md:gap-6 w-64">
                        <div className="text-right">
                          <p className="text-3xl font-bold text-slate-900">{target.achievement}%</p>
                          <p className="text-xs text-slate-500">Achievement</p>
                        </div>
                        <div className="w-full md:w-32">
                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${progressColor === 'success' ? 'bg-success-500' : progressColor === 'pharma' ? 'bg-pharma-500' : progressColor === 'warning' ? 'bg-warning-500' : 'bg-danger-500'}`}
                              style={{ width: `${Math.min(target.achievement, 100)}%` }}
                            />
                          </div>
                        </div>
                        <Badge variant={badgeVariant} className="whitespace-nowrap">
                          {target.achievement >= 100 ? 'Target Met' : target.achievement >= 75 ? 'On Track' : target.achievement >= 50 ? 'Behind' : 'At Risk'}
                        </Badge>
                      </div>
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden mt-4 pt-4 border-t border-slate-200 grid grid-cols-3 gap-3">
                      <div className="p-3 bg-slate-50 rounded">
                        <p className="font-bold text-pharma-600">{target.completed}/{target.totalVisits}</p>
                        <p className="text-xs text-slate-500">Visits</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded">
                        <p className="font-bold text-slate-900">{target.totalDoctors}</p>
                        <p className="text-xs text-slate-500">Doctors</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded">
                        <p className="font-bold text-success-600">{target.newDoctors}</p>
                        <p className="text-xs text-slate-500">New</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Target Templates */}
      <Card variant="elevated" className="mt-6">
        <CardHeader>
          <CardTitle>Target Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 mb-4">Standard templates for quick target setting</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: 'Standard Rep', visits: 20, doctors: 15, new: 3, followUps: 10, desc: 'For experienced reps' },
              { name: 'Senior Rep', visits: 25, doctors: 20, new: 5, followUps: 15, desc: 'For top performers' },
              { name: 'New Hire (Ramp)', visits: 15, doctors: 10, new: 5, followUps: 5, desc: 'First 3 months' },
            ].map((template) => (
              <div key={template.name} className="p-4 border border-slate-200 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-1">{template.name}</h4>
                <p className="text-sm text-slate-500 mb-3">{template.desc}</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-2 bg-slate-50 rounded">
                    <p className="text-xl font-bold text-pharma-600">{template.visits}</p>
                    <p className="text-xs text-slate-500">Visits</p>
                  </div>
                  <div className="p-2 bg-slate-50 rounded">
                    <p className="text-xl font-bold text-slate-900">{template.doctors}</p>
                    <p className="text-xs text-slate-500">Doctors</p>
                  </div>
                  <div className="p-2 bg-slate-50 rounded">
                    <p className="text-xl font-bold text-success-600">{template.new}</p>
                    <p className="text-xs text-slate-500">New</p>
                  </div>
                  <div className="p-2 bg-slate-50 rounded">
                    <p className="text-xl font-bold text-warning-600">{template.followUps}</p>
                    <p className="text-xs text-slate-500">Follow-ups</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  Apply Template
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </ManagerLayout>
  );
}