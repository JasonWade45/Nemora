'use client';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { 
  Target, Plus, Search, Filter, Edit, Trash2, 
  TrendingUp, AlertCircle, CheckCircle, Users
} from 'lucide-react';
import { MOCK_TARGETS, MOCK_REPS } from '@/lib/mock-data';
import { format } from 'date-fns';
import { useState, useMemo } from 'react';

export default function AdminTargetsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = [2024, 2025, 2026];

  const filteredTargets = useMemo(() => {
    return MOCK_TARGETS
      .filter(t => t.month === monthFilter && t.year === yearFilter)
      .map(t => {
        const rep = MOCK_REPS.find(r => r.id === t.repId);
        return { ...t, repName: rep?.name || 'Unknown', repEmail: rep?.email || '' };
      });
  }, [monthFilter, yearFilter]);

  const totalTarget = filteredTargets.reduce((a, b) => a + b.totalVisits, 0);
  const avgTarget = filteredTargets.length > 0 ? Math.round(totalTarget / filteredTargets.length) : 0;

  return (
    <AdminLayout 
      title="Targets & KPIs" 
      subtitle="Set and manage monthly targets for medical representatives"
      headerActions={
        <Button asChild>
          <a href="/admin/targets/new">
            <Plus className="w-4 h-4 mr-2" />
            Set Targets
          </a>
        </Button>
      }
      breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Targets' }]}
    >
      {/* Period Selector */}
      <Card variant="elevated" className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex gap-3">
              <Select
                label="Month"
                value={monthFilter.toString()}
                onChange={(e) => setMonthFilter(parseInt(e.target.value))}
                options={months.map(m => ({ value: m.toString(), label: format(new Date(2024, m-1), 'MMMM') }))}
                className="w-40"
              />
              <Select
                label="Year"
                value={yearFilter.toString()}
                onChange={(e) => setYearFilter(parseInt(e.target.value))}
                options={years.map(y => ({ value: y.toString(), label: y.toString() }))}
                className="w-28"
              />
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Avg Target: {avgTarget} visits
              </span>
              <span className="flex items-center gap-1">
                <Target className="w-4 h-4" />
                Total: {totalTarget} visits
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Targets Grid */}
      <Card variant="elevated">
        <CardContent className="p-0">
          {filteredTargets.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No targets set for this period</p>
              <Button className="mt-4" asChild>
                <a href="/admin/targets/new">Set Targets for This Month</a>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredTargets.map((target) => (
                <div key={target.id} className="p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-pharma-100 flex items-center justify-center">
                        <Target className="w-6 h-6 text-pharma-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{target.repName}</h3>
                        <p className="text-sm text-slate-500">{target.repEmail}</p>
                      </div>
                    </div>

                    <div className="flex-1 grid grid-cols-3 gap-6 md:grid-cols-5">
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold text-pharma-600">{target.totalVisits}</p>
                        <p className="text-xs text-slate-500">Total Visits</p>
                      </div>
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold text-slate-900">{target.totalDoctors}</p>
                        <p className="text-xs text-slate-500">Doctors</p>
                      </div>
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold text-success-600">{target.newDoctors}</p>
                        <p className="text-xs text-slate-500">New Doctors</p>
                      </div>
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold text-warning-600">{target.followUps}</p>
                        <p className="text-xs text-slate-500">Follow-ups</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button variant="ghost" size="icon" className="text-slate-500 hover:text-danger-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Bulk Actions */}
              <div className="p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-pharma-600" />
                  <span className="text-sm font-medium text-slate-700">Select All ({filteredTargets.length})</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Copy from Previous Month
                  </Button>
                  <Button variant="primary" size="sm">
                    Bulk Update
                  </Button>
                </div>
              </div>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: 'Standard Rep', visits: 20, doctors: 15, new: 3, followUps: 10 },
              { name: 'Senior Rep', visits: 25, doctors: 20, new: 5, followUps: 15 },
              { name: 'New Hire', visits: 15, doctors: 10, new: 5, followUps: 5 },
            ].map((template) => (
              <div key={template.name} className="p-4 border border-slate-200 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-3">{template.name}</h4>
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
    </AdminLayout>
  );
}