'use client';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/Tabs';
import {
  Building2, User, Shield, Bell, Database,
  Globe, CreditCard, Eye, EyeOff, MapPin, Users
} from 'lucide-react';
import { useState } from 'react';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<'company' | 'users' | 'security' | 'notifications' | 'integrations' | 'billing'>('company');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <AdminLayout 
      title="Settings" 
      subtitle="Configure your PharmaCRM account"
      breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Settings' }]}
    >
      <Tabs value={activeTab} onChange={(value) => setActiveTab(value as 'company' | 'users' | 'security' | 'notifications' | 'integrations' | 'billing')} className="mb-6">
        <TabList className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <Tab value="company"><Building2 className="w-4 h-4 mr-1" /> Company</Tab>
          <Tab value="users"><User className="w-4 h-4 mr-1" /> Users</Tab>
          <Tab value="security"><Shield className="w-4 h-4 mr-1" /> Security</Tab>
          <Tab value="notifications"><Bell className="w-4 h-4 mr-1" /> Notifications</Tab>
          <Tab value="integrations"><Globe className="w-4 h-4 mr-1" /> Integrations</Tab>
          <Tab value="billing"><CreditCard className="w-4 h-4 mr-1" /> Billing</Tab>
        </TabList>

        <TabPanel value="company">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Basic information about your organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Company Name" defaultValue="PharmaCorp Industries" />
                <Input label="Company Slug" defaultValue="pharmacorp" helperText="Used in URLs" />
                <Input label="Website" type="url" placeholder="https://pharmacorp.com" />
                <Input label="Industry" defaultValue="Pharmaceuticals" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Street" defaultValue="100 Pharma Boulevard" />
                  <Input label="City" defaultValue="San Francisco" />
                  <Input label="State" defaultValue="CA" />
                  <Input label="ZIP Code" defaultValue="94105" />
                  <Input label="Country" defaultValue="United States" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Logo</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-lg bg-pharma-100 flex items-center justify-center border-2 border-dashed border-pharma-300">
                    <Building2 className="w-8 h-8 text-pharma-500" />
                  </div>
                  <Button variant="outline">Upload Logo</Button>
                </div>
              </div>
              <Button>Save Company Settings</Button>
            </CardContent>
          </Card>

          <Card variant="elevated" className="mt-6">
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>Manage your plan and billing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-pharma-50 rounded-lg border border-pharma-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">Professional Plan</p>
                    <p className="text-sm text-slate-500">$199/month • Up to 25 users</p>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline">Upgrade Plan</Button>
                <Button variant="outline">Manage Billing</Button>
                <Button variant="ghost">Cancel Subscription</Button>
              </div>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value="users">
          <Card variant="elevated">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Manage user access and roles</CardDescription>
              </div>
              <Button>
                <User className="w-4 h-4 mr-1" />
                Invite User
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: 'Dr. Sarah Mitchell', email: 'admin@pharmacorp.com', role: 'Admin', status: 'Active', lastLogin: '2 min ago' },
                  { name: 'James Rodriguez', email: 'manager@pharmacorp.com', role: 'Manager', status: 'Active', lastLogin: '1 hour ago' },
                  { name: 'Emily Chen', email: 'rep1@pharmacorp.com', role: 'Medical Rep', status: 'Active', lastLogin: '5 min ago' },
                  { name: 'Michael Thompson', email: 'rep2@pharmacorp.com', role: 'Medical Rep', status: 'Active', lastLogin: '2 hours ago' },
                ].map((user, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-pharma-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-pharma-600">{user.name.split(' ').map(n => n[0]).join('')}</span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{user.name}</p>
                        <p className="text-sm text-slate-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={user.role === 'Admin' ? 'info' : user.role === 'Manager' ? 'warning' : 'success'}>
                        {user.role}
                      </Badge>
                      <Badge variant={user.status === 'Active' ? 'success' : 'default'} dot>
                        {user.status}
                      </Badge>
                      <span className="text-sm text-slate-500">{user.lastLogin}</span>
                      <Button variant="ghost" size="icon">Edit</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value="security">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Password & Authentication</CardTitle>
              <CardDescription>Manage your login credentials and security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Current Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter current password"
                      rightIcon={
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-slate-600">
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
                  <Input type="password" placeholder="Enter new password" helperText="Min 8 characters" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Confirm Password</label>
                  <Input type="password" placeholder="Confirm new password" />
                </div>
              </div>
              <Button>Update Password</Button>
            </CardContent>
          </Card>

          <Card variant="elevated" className="mt-6">
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>Add an extra layer of security to your account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">2FA Status</p>
                    <p className="text-sm text-slate-500">Disabled - Enable for better security</p>
                  </div>
                  <Button variant="outline">Enable 2FA</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated" className="mt-6">
            <CardHeader>
              <CardTitle>Session Management</CardTitle>
              <CardDescription>Active sessions and devices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-pharma-100 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-pharma-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Current Session</p>
                      <p className="text-sm text-slate-500">Chrome on Windows • San Francisco, CA</p>
                    </div>
                  </div>
                  <Badge variant="success" dot>Active Now</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Mobile App</p>
                      <p className="text-sm text-slate-500">iOS • Last active 2 hours ago</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-danger-600">Revoke</Button>
                </div>
              </div>
              <Button variant="ghost" className="w-full text-danger-600">Revoke All Other Sessions</Button>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value="notifications">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how and when you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { title: 'New Visit Assigned', desc: 'When a manager assigns you a visit', email: true, push: true, inApp: true },
                { title: 'Visit Reminders', desc: '15 minutes before scheduled visits', email: false, push: true, inApp: true },
                { title: 'Target Updates', desc: 'Monthly target progress notifications', email: true, push: false, inApp: true },
                { title: 'System Announcements', desc: 'Important updates and maintenance notices', email: true, push: true, inApp: true },
                { title: 'Weekly Reports', desc: 'Weekly performance summary', email: true, push: false, inApp: true },
              ].map((notif, i) => (
                <div key={i} className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{notif.title}</p>
                      <p className="text-sm text-slate-500">{notif.desc}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" defaultChecked={notif.email} className="w-4 h-4 rounded border-slate-300 text-pharma-600" />
                        Email
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" defaultChecked={notif.push} className="w-4 h-4 rounded border-slate-300 text-pharma-600" />
                        Push
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" defaultChecked={notif.inApp} className="w-4 h-4 rounded border-slate-300 text-pharma-600" />
                        In-App
                      </label>
                    </div>
                  </div>
                </div>
              ))}
              <Button>Save Notification Preferences</Button>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value="integrations">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Third-Party Integrations</CardTitle>
              <CardDescription>Connect PharmaCRM with your existing tools</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: 'Salesforce', desc: 'Sync doctors and visits', icon: Globe, connected: false },
                { name: 'Veeva CRM', desc: 'Pharmaceutical CRM integration', icon: Database, connected: false },
                { name: 'Google Maps', desc: 'Location services and routing', icon: MapPin, connected: true },
                { name: 'Slack', desc: 'Team notifications', icon: MessageSquare, connected: false },
                { name: 'Microsoft Teams', desc: 'Collaboration and alerts', icon: Users, connected: false },
                { name: 'Email (SMTP)', desc: 'Custom email delivery', icon: Mail, connected: true },
              ].map((integration, i) => (
                <div key={i} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-pharma-100 flex items-center justify-center">
                      <integration.icon className="w-6 h-6 text-pharma-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{integration.name}</p>
                      <p className="text-sm text-slate-500">{integration.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={integration.connected ? 'success' : 'outline'} dot>
                      {integration.connected ? 'Connected' : 'Not Connected'}
                    </Badge>
                    <Button variant={integration.connected ? 'ghost' : 'outline'} size="sm">
                      {integration.connected ? 'Disconnect' : 'Connect'}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value="billing">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Billing Information</CardTitle>
              <CardDescription>Manage payment methods and invoices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-pharma-50 rounded-lg border border-pharma-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">Current Plan: Professional</p>
                    <p className="text-sm text-slate-500">$199/month • Billed monthly • Next: Jan 15, 2025</p>
                  </div>
                  <Button variant="outline">Change Plan</Button>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-slate-900 mb-4">Payment Method</h4>
                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-8 rounded bg-slate-100 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Visa ending in 4242</p>
                      <p className="text-sm text-slate-500">Expires 12/2026</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">Update</Button>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-slate-900 mb-4">Recent Invoices</h4>
                <div className="space-y-2">
                  {[
                    { date: 'Dec 1, 2024', amount: '$199.00', status: 'Paid' },
                    { date: 'Nov 1, 2024', amount: '$199.00', status: 'Paid' },
                    { date: 'Oct 1, 2024', amount: '$199.00', status: 'Paid' },
                  ].map((inv, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">Invoice #{1000 + i}</p>
                        <p className="text-sm text-slate-500">{inv.date}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-medium text-slate-900">{inv.amount}</span>
                        <Badge variant="success">{inv.status}</Badge>
                        <Button variant="ghost" size="icon" className="text-slate-400">Download</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabPanel>
      </Tabs>
    </AdminLayout>
  );
}

// Missing icons
const MessageSquare = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const Mail = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);