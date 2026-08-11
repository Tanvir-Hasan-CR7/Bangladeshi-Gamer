import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Settings, VoteLink, News, Rule, AdminEmail } from '../../types';
import { 
  Settings as SettingsIcon, 
  Globe, 
  MessageSquare, 
  Plus, 
  Trash2, 
  Edit2, 
  Save,
  CheckCircle,
  RefreshCw,
  FileText,
  Shield,
  X,
  AlertTriangle,
  Info,
  List,
  Mail
} from 'lucide-react';
import { cn } from '../../lib/utils';
import Notification, { NotificationType } from '../../components/Notification';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function AdminSettings() {
  const [settings, setSettings] = useState<Settings>({ 
    server_ip: '', 
    discord_link: '',
    server_name: '',
    server_icon: '',
    primary_color: '#9333ea',
    secondary_color: '#2563eb',
    brand_color_1: '#06b6d4',
    brand_color_2: '#22d3ee',
    hero_bg_url: '',
    rules_bg_url: '',
    rules_border_color: '#9333ea',
    discord_order_webhook: '',
    store_banner_url: '',
    store_welcome_title: '',
    store_welcome_description: '',
    payment_number_bkash: '',
    payment_number_nagad: '',
    payment_number_rocket: '',
    payment_info_bkash: '',
    payment_info_nagad: '',
    payment_info_rocket: '',
    payment_info_other: '',
    mysql_host: '',
    mysql_port: '3306',
    mysql_database: '',
    mysql_user: '',
    mysql_password: '',
    mysql_jdbc_string: '',
    supabase_url: 'https://sce6tjpwseiyai5m7nx5ze.supabase.co',
    supabase_key: '',
    supabase_table: 'aj_leaderboards',
    supabase_auto_sync: true,
    supabase_sync_interval_mins: 5
  });
  const [voteLinks, setVoteLinks] = useState<VoteLink[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [adminEmails, setAdminEmails] = useState<AdminEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [testStatus, setTestStatus] = useState<{ success?: boolean; message?: string; loading?: boolean }>({});
  const [syncStatus, setSyncStatus] = useState<{ success?: boolean; message?: string; loading?: boolean; recordsSynced?: number; metricsProcessed?: number; lastRun?: string }>({});

  // Modals
  const [isAddingVoteLink, setIsAddingVoteLink] = useState(false);
  const [isAddingNews, setIsAddingNews] = useState(false);
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [isAddingAdminEmail, setIsAddingAdminEmail] = useState(false);
  const [editingVoteLink, setEditingVoteLink] = useState<VoteLink | null>(null);
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);

  // Forms
  const [voteLinkForm, setVoteLinkForm] = useState({ name: '', url: '' });
  const [newsForm, setNewsForm] = useState({ title: '', content: '', author: '', image_url: '' });
  const [ruleForm, setRuleForm] = useState({ title: '', description: '', order: 0 });
  const [adminEmailForm, setAdminEmailForm] = useState({ email: '' });
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Notifications & Dialogs
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'news' | 'vote' | 'rule' | 'admin_email' } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 'global')
      .single();
    
    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
    }
    if (settingsData) {
      console.log('Fetched settings data:', settingsData);
      setSettings(settingsData as Settings);
    }

    const { data: voteData } = await supabase.from('vote_links').select('*');
    if (voteData) setVoteLinks(voteData as VoteLink[]);

    const { data: newsData } = await supabase.from('news').select('*').order('created_at', { ascending: false });
    if (newsData) setNews(newsData as News[]);

    const { data: rulesData } = await supabase.from('rules').select('*').order('order', { ascending: true });
    if (rulesData) setRules(rulesData as Rule[]);

    const { data: adminData } = await supabase.from('admin_emails').select('*').order('created_at', { ascending: true });
    if (adminData) setAdminEmails(adminData as AdminEmail[]);

    setLoading(false);
  };

  const saveSettings = async () => {
    setSaveStatus('saving');
    try {
      console.log('Attempting to save settings:', settings);
      
      const payload = { 
        id: 'global', 
        server_ip: settings.server_ip || '', 
        discord_link: settings.discord_link || '',
        server_name: settings.server_name || '',
        server_icon: settings.server_icon || '',
        primary_color: settings.primary_color || '#9333ea',
        secondary_color: settings.secondary_color || '#2563eb',
        brand_color_1: settings.brand_color_1 || '#06b6d4',
        brand_color_2: settings.brand_color_2 || '#22d3ee',
        brand_name_split: settings.brand_name_split || 0,
        brand_name_first: settings.brand_name_first || 'United',
        brand_name_second: settings.brand_name_second || 'Realm',
        hero_bg_url: settings.hero_bg_url || '',
        patron_image_url: settings.patron_image_url || '',
        rules_bg_url: settings.rules_bg_url || '',
        rules_border_color: settings.rules_border_color || '#9333ea',
        discord_order_webhook: settings.discord_order_webhook || '',
        store_banner_url: settings.store_banner_url || '',
        store_welcome_title: settings.store_welcome_title || '',
        store_welcome_description: settings.store_welcome_description || '',
        payment_number_bkash: settings.payment_number_bkash || '',
        payment_number_nagad: settings.payment_number_nagad || '',
        payment_number_rocket: settings.payment_number_rocket || '',
        payment_info_bkash: settings.payment_info_bkash || '',
        payment_info_nagad: settings.payment_info_nagad || '',
        payment_info_rocket: settings.payment_info_rocket || '',
        payment_info_other: settings.payment_info_other || '',
        mysql_host: settings.mysql_host || '',
        mysql_port: settings.mysql_port || '3306',
        mysql_database: settings.mysql_database || '',
        mysql_user: settings.mysql_user || '',
        mysql_password: settings.mysql_password || '',
        mysql_jdbc_string: settings.mysql_jdbc_string || '',
        supabase_url: settings.supabase_url || '',
        supabase_key: settings.supabase_key || '',
        supabase_table: settings.supabase_table || 'aj_leaderboards',
        supabase_auto_sync: settings.supabase_auto_sync ?? true,
        supabase_sync_interval_mins: settings.supabase_sync_interval_mins || 5
      };

      // Use upsert for simplicity and robustness
      const { error, status, statusText } = await supabase
        .from('settings')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error('Supabase settings save error:', error);
        
        const isMissingColumns = error.message?.includes('payment_number_bkash') || 
                                 error.message?.includes('payment_number_nagad') ||
                                 error.message?.includes('payment_number_rocket') ||
                                 error.message?.includes('mysql_database') ||
                                 error.message?.includes('mysql_host') ||
                                 error.code === '42703' || 
                                 error.code === 'PGRST204';
                                 
        if (isMissingColumns) {
          // Retry without the new manual payment & mysql columns
          const { 
            payment_number_bkash, 
            payment_number_nagad, 
            payment_number_rocket, 
            payment_info_bkash, 
            payment_info_nagad, 
            payment_info_rocket, 
            payment_info_other,
            mysql_host,
            mysql_port,
            mysql_database,
            mysql_user,
            mysql_password,
            mysql_jdbc_string,
            ...strippedPayload 
          } = payload;

          const { error: retryError } = await supabase
            .from('settings')
            .upsert(strippedPayload, { onConflict: 'id' });

          if (retryError) throw retryError;
          
          setSaveStatus('saved');
          setNotification({ 
            message: 'Settings saved! Note: Database columns for MySQL or manual payments are missing in your Supabase table. Run the updated supabase_schema.sql to store them permanently.', 
            type: 'info' 
          });
          setTimeout(() => setSaveStatus('idle'), 5000);
          return;
        }

        setNotification({ 
          message: `Failed to save settings: ${error.message} (Status: ${status} ${statusText})`, 
          type: 'error' 
        });
        throw error;
      }
      
      setSaveStatus('saved');
      setNotification({ message: 'Settings saved successfully!', type: 'success' });
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error: any) {
      console.error('Error saving settings:', error);
      if (!error.message?.includes('Status:')) {
        setNotification({ 
          message: `Failed to save settings: ${error.message || 'Unknown error'}. Check console for details.`, 
          type: 'error' 
        });
      }
      setSaveStatus('idle');
    }
  };

  const handleVoteLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVoteLink) {
      const { error } = await supabase.from('vote_links').update(voteLinkForm).eq('id', editingVoteLink.id);
      if (error) { 
        setNotification({ message: `Error: ${error.message}`, type: 'error' });
        return; 
      }
      setNotification({ message: 'Vote link updated!', type: 'success' });
    } else {
      const { error } = await supabase.from('vote_links').insert(voteLinkForm);
      if (error) { 
        setNotification({ message: `Error: ${error.message}`, type: 'error' });
        return; 
      }
      setNotification({ message: 'Vote link added!', type: 'success' });
    }
    await fetchData();
    setIsAddingVoteLink(false);
    setEditingVoteLink(null);
    setVoteLinkForm({ name: '', url: '' });
    fetchData();
  };

  const handleNewsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    const author = newsForm.author || session?.user?.email || 'Admin';

    if (editingNews) {
      const { error } = await supabase.from('news').update({ ...newsForm, author }).eq('id', editingNews.id);
      if (error) {
        setNotification({ message: `Error: ${error.message}`, type: 'error' });
        return;
      }
      setNotification({ message: 'Article updated!', type: 'success' });
    } else {
      const { error } = await supabase.from('news').insert({ ...newsForm, author });
      if (error) {
        setNotification({ message: `Error: ${error.message}`, type: 'error' });
        return;
      }
      setNotification({ message: 'Article posted!', type: 'success' });
    }
    setIsAddingNews(false);
    setEditingNews(null);
    setNewsForm({ title: '', content: '', author: '', image_url: '' });
    fetchData();
  };

  const handleRuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRule) {
      const { error } = await supabase.from('rules').update(ruleForm).eq('id', editingRule.id);
      if (error) {
        setNotification({ message: `Error: ${error.message}`, type: 'error' });
        return;
      }
      setNotification({ message: 'Rule updated!', type: 'success' });
    } else {
      const { error } = await supabase.from('rules').insert(ruleForm);
      if (error) {
        setNotification({ message: `Error: ${error.message}`, type: 'error' });
        return;
      }
      setNotification({ message: 'Rule added!', type: 'success' });
    }
    setIsAddingRule(false);
    setEditingRule(null);
    setRuleForm({ title: '', description: '', order: 0 });
    fetchData();
  };

  const handleAdminEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailToInsert = adminEmailForm.email.trim();
    if (!emailToInsert) {
      setNotification({ message: 'Please enter a valid email address.', type: 'error' });
      return;
    }

    try {
      console.log('Inserting admin email:', emailToInsert);
      const { error } = await supabase.from('admin_emails').insert({ email: emailToInsert.toLowerCase() });
      if (error) {
        setNotification({ message: `Error: ${error.message}`, type: 'error' });
        return;
      }
      
      // Also try to update existing profile if user already exists
      await supabase.from('profiles').update({ role: 'admin' }).eq('email', emailToInsert);
      
      setNotification({ message: `Success! Added ${emailToInsert} as an authorized admin.`, type: 'success' });
      setIsAddingAdminEmail(false);
      setAdminEmailForm({ email: '' });
      await fetchData();
    } catch (err: any) {
      console.error('Failed to grant admin access:', err);
      setNotification({ message: `Failed to add admin: ${err.message || 'Unknown error'}`, type: 'error' });
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setNotification({ message: 'Passwords do not match.', type: 'error' });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setNotification({ message: 'Password must be at least 6 characters long.', type: 'error' });
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
      if (error) {
        setNotification({ message: `Error updating password: ${error.message}`, type: 'error' });
      } else {
        setNotification({ message: 'Success! Your admin security password has been changed.', type: 'success' });
        setPasswordForm({ newPassword: '', confirmPassword: '' });
      }
    } catch (err: any) {
      setNotification({ message: `Failed to change password: ${err.message || 'Unknown error'}`, type: 'error' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const deleteVoteLink = async (id: string) => {
    setItemToDelete(null);
    try {
      const { error } = await supabase.from('vote_links').delete().eq('id', id);
      if (error) throw error;
      setNotification({ message: 'Vote link deleted.', type: 'success' });
      fetchData();
    } catch (err: any) {
      setNotification({ message: `Error: ${err.message}`, type: 'error' });
    }
  };

  const deleteNews = async (id: string) => {
    setItemToDelete(null);
    try {
      const { error } = await supabase.from('news').delete().eq('id', id);
      if (error) throw error;
      setNotification({ message: 'News article deleted.', type: 'success' });
      fetchData();
    } catch (err: any) {
      setNotification({ message: `Error: ${err.message}`, type: 'error' });
    }
  };

  const deleteRule = async (id: string) => {
    setItemToDelete(null);
    try {
      const { error } = await supabase.from('rules').delete().eq('id', id);
      if (error) throw error;
      setNotification({ message: 'Rule deleted.', type: 'success' });
      fetchData();
    } catch (err: any) {
      setNotification({ message: `Error: ${err.message}`, type: 'error' });
    }
  };

  const deleteAdminEmail = async (id: string, email: string) => {
    setItemToDelete(null);
    try {
      // Don't allow deleting the primary admin if possible, but for now just proceed
      const { error } = await supabase.from('admin_emails').delete().eq('id', id);
      if (error) throw error;
      
      // Also try to demote existing profile
      await supabase.from('profiles').update({ role: 'user' }).eq('email', email);
      
      setNotification({ message: 'Admin email removed.', type: 'success' });
      fetchData();
    } catch (err: any) {
      setNotification({ message: `Error: ${err.message}`, type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {notification && (
        <Notification 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification(null)} 
        />
      )}

      <ConfirmDialog
        isOpen={!!itemToDelete}
        title={`Delete ${itemToDelete?.type === 'news' ? 'News Article' : itemToDelete?.type === 'vote' ? 'Vote Link' : itemToDelete?.type === 'rule' ? 'Rule' : 'Admin Email'}`}
        message={`Are you sure you want to delete this ${itemToDelete?.type === 'news' ? 'article' : itemToDelete?.type === 'vote' ? 'link' : itemToDelete?.type === 'rule' ? 'rule' : 'admin email'}? This action cannot be undone.`}
        confirmText="Delete"
        isDanger={true}
        onConfirm={() => {
          if (itemToDelete?.type === 'news') deleteNews(itemToDelete.id);
          else if (itemToDelete?.type === 'vote') deleteVoteLink(itemToDelete.id);
          else if (itemToDelete?.type === 'rule') deleteRule(itemToDelete.id);
          else if (itemToDelete?.type === 'admin_email') {
            const email = adminEmails.find(a => a.id === itemToDelete.id)?.email;
            if (email) deleteAdminEmail(itemToDelete.id, email);
          }
        }}
        onCancel={() => setItemToDelete(null)}
      />

      {/* Global Settings */}
      <section className="glass p-8 rounded-3xl border-slate-800/50 space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
            <SettingsIcon className="w-6 h-6 text-purple-500" />
            <span>Global Settings</span>
          </h2>
          <button
            onClick={saveSettings}
            disabled={saveStatus !== 'idle'}
            className={cn(
              "flex items-center space-x-2 px-6 py-2 rounded-xl text-sm font-bold transition-all",
              saveStatus === 'saved' ? "bg-green-600 text-white" : "bg-purple-600 hover:bg-purple-700 text-white"
            )}
          >
            {saveStatus === 'saving' ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 
             saveStatus === 'saved' ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save Changes'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Server IP Address</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={settings.server_ip}
                onChange={(e) => setSettings({ ...settings, server_ip: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="play.unitedrealm.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Discord Invite Link</label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={settings.discord_link}
                onChange={(e) => setSettings({ ...settings, discord_link: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="https://discord.gg/united"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Discord Order Webhook URL</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={settings.discord_order_webhook}
                onChange={(e) => setSettings({ ...settings, discord_order_webhook: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="https://discord.com/api/webhooks/..."
              />
            </div>
            <p className="text-[10px] text-slate-500 italic ml-1">Discord will receive an embed message for every new order.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Server Name</label>
            <input
              type="text"
              value={settings.server_name}
              onChange={(e) => setSettings({ ...settings, server_name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Eternity Hub"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Server Icon URL</label>
            <input
              type="text"
              value={settings.server_icon}
              onChange={(e) => setSettings({ ...settings, server_icon: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="https://example.com/logo.png"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Primary Theme Color</label>
            <div className="flex items-center space-x-4">
              <input
                type="color"
                value={settings.primary_color}
                onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                className="w-12 h-12 bg-transparent border-none cursor-pointer"
              />
              <input
                type="text"
                value={settings.primary_color}
                onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                className="flex-grow bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Secondary Theme Color</label>
            <div className="flex items-center space-x-4">
              <input
                type="color"
                value={settings.secondary_color}
                onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                className="w-12 h-12 bg-transparent border-none cursor-pointer"
              />
              <input
                type="text"
                value={settings.secondary_color}
                onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                className="flex-grow bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Store Name - First Part (e.g. United)</label>
            <input
              type="text"
              value={settings.brand_name_first}
              onChange={(e) => setSettings({ ...settings, brand_name_first: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="United"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">First Part Color</label>
            <div className="flex items-center space-x-4">
              <input
                type="color"
                value={settings.brand_color_1}
                onChange={(e) => setSettings({ ...settings, brand_color_1: e.target.value })}
                className="w-12 h-12 bg-transparent border-none cursor-pointer"
              />
              <input
                type="text"
                value={settings.brand_color_1}
                onChange={(e) => setSettings({ ...settings, brand_color_1: e.target.value })}
                className="flex-grow bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Store Name - Second Part (e.g. Realm)</label>
            <input
              type="text"
              value={settings.brand_name_second}
              onChange={(e) => setSettings({ ...settings, brand_name_second: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Realm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Second Part Color</label>
            <div className="flex items-center space-x-4">
              <input
                type="color"
                value={settings.brand_color_2}
                onChange={(e) => setSettings({ ...settings, brand_color_2: e.target.value })}
                className="w-12 h-12 bg-transparent border-none cursor-pointer"
              />
              <input
                type="text"
                value={settings.brand_color_2}
                onChange={(e) => setSettings({ ...settings, brand_color_2: e.target.value })}
                className="flex-grow bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Brand Name Split Index (Legacy)</label>
            <input
              type="number"
              value={settings.brand_name_split}
              onChange={(e) => setSettings({ ...settings, brand_name_split: parseInt(e.target.value) || 0 })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="0 = split by space, >0 = split at character index"
            />
            <p className="text-[10px] text-slate-500 italic">This is now secondary to the First/Second part fields above.</p>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Home Page Hero Background URL</label>
            <input
              type="text"
              value={settings.hero_bg_url}
              onChange={(e) => setSettings({ ...settings, hero_bg_url: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="https://example.com/hero-bg.jpg"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Patron Page Image URL</label>
            <input
              type="text"
              value={settings.patron_image_url}
              onChange={(e) => setSettings({ ...settings, patron_image_url: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="https://example.com/patron-image.jpg"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Rules Page Background URL</label>
            <input
              type="text"
              value={settings.rules_bg_url}
              onChange={(e) => setSettings({ ...settings, rules_bg_url: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="https://example.com/rules-bg.jpg"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Rules Box Border Color</label>
            <div className="flex items-center space-x-4">
              <input
                type="color"
                value={settings.rules_border_color}
                onChange={(e) => setSettings({ ...settings, rules_border_color: e.target.value })}
                className="w-12 h-12 bg-transparent border-none cursor-pointer"
              />
              <input
                type="text"
                value={settings.rules_border_color}
                onChange={(e) => setSettings({ ...settings, rules_border_color: e.target.value })}
                className="flex-grow bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          
          {/* Store Home Page Settings */}
          <div className="space-y-2 md:col-span-2">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-4">Store Landing Customizer</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Store Banner Image URL (Home)</label>
                <input
                  type="text"
                  value={settings.store_banner_url || ''}
                  onChange={(e) => setSettings({ ...settings, store_banner_url: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="https://example.com/store-banner.png"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Store Welcome Title</label>
                <input
                  type="text"
                  value={settings.store_welcome_title || ''}
                  onChange={(e) => setSettings({ ...settings, store_welcome_title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Welcome to the Official Vortex Store"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Store Welcome Description (Markdown Supported)</label>
                <textarea
                  value={settings.store_welcome_description || ''}
                  onChange={(e) => setSettings({ ...settings, store_welcome_description: e.target.value })}
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                  placeholder="Welcome to the store! Here you can buy ranks, keys, and coins..."
                />
              </div>
            </div>
          </div>

          {/* Manual Payment Configurator */}
          <div className="space-y-4 md:col-span-2 pt-8 border-t border-slate-900">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Manual Payment Settings</h3>
            <p className="text-xs text-slate-500 italic">Configure the official phone numbers and instructions shown to players during checkout.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
              {/* bKash */}
              <div className="glass p-5 rounded-2xl border-slate-800/30 space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-800/50 pb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-pink-500"></div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">bKash Account</h4>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">bKash Number</label>
                  <input
                    type="text"
                    value={settings.payment_number_bkash || ''}
                    onChange={(e) => setSettings({ ...settings, payment_number_bkash: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                    placeholder="017XXXXXXXX (Personal/Agent)"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">bKash Instructions / Info</label>
                  <textarea
                    value={settings.payment_info_bkash || ''}
                    onChange={(e) => setSettings({ ...settings, payment_info_bkash: e.target.value })}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm font-sans"
                    placeholder="Send Money to our personal bKash number. Use IGN as reference."
                  />
                </div>
              </div>

              {/* Nagad */}
              <div className="glass p-5 rounded-2xl border-slate-800/30 space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-800/50 pb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Nagad Account</h4>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">Nagad Number</label>
                  <input
                    type="text"
                    value={settings.payment_number_nagad || ''}
                    onChange={(e) => setSettings({ ...settings, payment_number_nagad: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                    placeholder="018XXXXXXXX (Personal/Agent)"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">Nagad Instructions / Info</label>
                  <textarea
                    value={settings.payment_info_nagad || ''}
                    onChange={(e) => setSettings({ ...settings, payment_info_nagad: e.target.value })}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm font-sans"
                    placeholder="Use Send Money with Nagad. Confirm double checking the number."
                  />
                </div>
              </div>

              {/* Rocket */}
              <div className="glass p-5 rounded-2xl border-slate-800/30 space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-800/50 pb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Rocket Account</h4>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">Rocket Number</label>
                  <input
                    type="text"
                    value={settings.payment_number_rocket || ''}
                    onChange={(e) => setSettings({ ...settings, payment_number_rocket: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                    placeholder="019XXXXXXXX-X (include last digit)"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">Rocket Instructions / Info</label>
                  <textarea
                    value={settings.payment_info_rocket || ''}
                    onChange={(e) => setSettings({ ...settings, payment_info_rocket: e.target.value })}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm font-sans"
                    placeholder="Send Money to our Rocket wallet."
                  />
                </div>
              </div>

              {/* Other manual setup */}
              <div className="glass p-5 rounded-2xl border-slate-800/30 space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-800/50 pb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">General Checkout Description</h4>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">Instructions text at bottom of checkout</label>
                  <textarea
                    value={settings.payment_info_other || ''}
                    onChange={(e) => setSettings({ ...settings, payment_info_other: e.target.value })}
                    rows={6}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm font-sans"
                    placeholder="Instructions: Send the exact amount. Copy TxID. Fill sender number and click submit."
                  />
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Database Settings Section (ajLeaderboards MySQL) */}
      <section className="space-y-6 mb-12">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-cyan-500 inline-block"></span>
              <span>Minecraft Database Settings (ajLeaderboards MySQL)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">Configure your MySQL database connection (e.g. Pterodactyl / NyctoHost) to stream live leaderboards.</p>
          </div>
          <button
            onClick={saveSettings}
            disabled={saveStatus === 'saving'}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm transition-all shadow-lg shadow-purple-600/25"
          >
            <Save className="w-4 h-4" />
            <span>{saveStatus === 'saving' ? 'Saving...' : 'Save Database Settings'}</span>
          </button>
        </div>

        <div className="glass p-6 rounded-3xl border-slate-800/50 space-y-6">
          {/* JDBC Connection String Parser */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
            <label className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center justify-between">
              <span>[Optional] JDBC Connection String Parser</span>
              <span className="text-[10px] text-slate-500 lowercase font-normal">Auto-extracts host, port, db, user & password</span>
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={settings.mysql_jdbc_string || ''}
                onChange={(e) => setSettings({ ...settings, mysql_jdbc_string: e.target.value })}
                placeholder="jdbc:mysql://u168_50U0Rj2EOa:PASSWORD@lemon.nyctohost.com:3306/s168_Database"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <button
                type="button"
                onClick={() => {
                  const jdbc = settings.mysql_jdbc_string || '';
                  if (!jdbc.trim()) return;
                  try {
                    const clean = jdbc.replace(/^jdbc:mysql:\/\//, '');
                    const atIndex = clean.indexOf('@');
                    if (atIndex === -1) return;
                    const creds = clean.substring(0, atIndex);
                    const rest = clean.substring(atIndex + 1);
                    
                    const colonIndex = creds.indexOf(':');
                    const rawUser = colonIndex !== -1 ? creds.substring(0, colonIndex) : creds;
                    const rawPassword = colonIndex !== -1 ? creds.substring(colonIndex + 1) : '';
                    let user = rawUser;
                    let password = rawPassword;
                    try { user = decodeURIComponent(rawUser); } catch {}
                    try { password = decodeURIComponent(rawPassword); } catch {}

                    const slashIndex = rest.indexOf('/');
                    const hostPort = slashIndex !== -1 ? rest.substring(0, slashIndex) : rest;
                    const dbNameAndQuery = slashIndex !== -1 ? rest.substring(slashIndex + 1) : '';
                    const database = dbNameAndQuery.split('?')[0];

                    let host = hostPort;
                    let port = '3306';
                    const hpColon = hostPort.lastIndexOf(':');
                    if (hpColon !== -1) {
                      host = hostPort.substring(0, hpColon);
                      port = hostPort.substring(hpColon + 1);
                    }

                    setSettings(prev => ({
                      ...prev,
                      mysql_host: `${host}:${port}`,
                      mysql_port: port,
                      mysql_database: database,
                      mysql_user: user,
                      mysql_password: password
                    }));
                    setNotification({ message: 'JDBC connection string parsed and fields auto-filled successfully!', type: 'success' });
                  } catch (e) {
                    setNotification({ message: 'Failed to parse JDBC string. Check format.', type: 'error' });
                  }
                }}
                className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-xl transition-all whitespace-nowrap"
              >
                Auto-Fill Form
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Endpoint / Host:Port</label>
              <input
                type="text"
                value={settings.mysql_host || ''}
                onChange={(e) => setSettings({ ...settings, mysql_host: e.target.value })}
                placeholder="lemon.nyctohost.com:3306"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Database Name</label>
              <input
                type="text"
                value={settings.mysql_database || ''}
                onChange={(e) => setSettings({ ...settings, mysql_database: e.target.value })}
                placeholder="s168_Survival"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Username</label>
              <input
                type="text"
                value={settings.mysql_user || ''}
                onChange={(e) => setSettings({ ...settings, mysql_user: e.target.value })}
                placeholder="u168_50U0Rj2EOa"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Password</label>
              <input
                type="password"
                value={settings.mysql_password || ''}
                onChange={(e) => setSettings({ ...settings, mysql_password: e.target.value })}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={async () => {
                setTestStatus({ loading: true });
                try {
                  const res = await fetch('/api/mysql-test', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      host: settings.mysql_host,
                      port: settings.mysql_port,
                      database: settings.mysql_database,
                      user: settings.mysql_user,
                      password: settings.mysql_password,
                      jdbc_string: settings.mysql_jdbc_string
                    })
                  });
                  const json = await res.json();
                  if (res.ok && json.success) {
                    setTestStatus({ success: true, message: json.message });
                    setNotification({ message: json.message, type: 'success' });
                  } else {
                    setTestStatus({ success: false, message: json.error || 'Connection failed.' });
                    setNotification({ message: json.error || 'Connection failed.', type: 'error' });
                  }
                } catch (err: any) {
                  setTestStatus({ success: false, message: err.message || 'Connection test failed.' });
                  setNotification({ message: err.message || 'Connection test failed.', type: 'error' });
                } finally {
                  setTestStatus(prev => ({ ...prev, loading: false }));
                }
              }}
              disabled={testStatus.loading}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all flex items-center space-x-2"
            >
              {testStatus.loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />}
              <span>Test MySQL Connection</span>
            </button>

            {testStatus.message && (
              <span className={cn("text-xs font-medium", testStatus.success ? "text-emerald-400" : "text-red-400")}>
                {testStatus.message}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ajLeaderboards Supabase External Synchronization Service */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <RefreshCw className="w-5 h-5 text-purple-400" />
              <span>ajLeaderboards Supabase External Sync Service</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              External Node.js synchronization engine that reads your MySQL ajLeaderboards database and syncs verified rankings to Supabase (Zero Minecraft plugins required).
            </p>
          </div>
          <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold rounded-full">
            Node.js Service Ready
          </span>
        </div>

        <div className="glass p-6 rounded-3xl border-slate-800 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Supabase URL</label>
              <input
                type="text"
                value={settings.supabase_url || ''}
                onChange={(e) => setSettings({ ...settings, supabase_url: e.target.value })}
                placeholder="https://your-project.supabase.co"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Supabase Key (Service Role / Anon)</label>
              <input
                type="password"
                value={settings.supabase_key || ''}
                onChange={(e) => setSettings({ ...settings, supabase_key: e.target.value })}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Target Table Name</label>
              <input
                type="text"
                value={settings.supabase_table || 'aj_leaderboards'}
                onChange={(e) => setSettings({ ...settings, supabase_table: e.target.value })}
                placeholder="aj_leaderboards"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-300">Run via CLI or External Node.js Script</p>
              <p className="text-[11px] text-slate-500 mt-0.5">You can also execute the standalone synchronization service directly in your terminal:</p>
              <div className="mt-2 flex items-center space-x-3">
                <code className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-cyan-400">npm run sync</code>
                <span className="text-slate-600 text-xs">or continuous loop:</span>
                <code className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-purple-400">npm run sync:daemon</code>
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                setSyncStatus({ loading: true });
                try {
                  const res = await fetch('/api/sync/supabase', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      mysql_host: settings.mysql_host,
                      mysql_port: settings.mysql_port,
                      mysql_database: settings.mysql_database,
                      mysql_user: settings.mysql_user,
                      mysql_password: settings.mysql_password,
                      supabase_url: settings.supabase_url,
                      supabase_key: settings.supabase_key,
                      supabase_table: settings.supabase_table || 'aj_leaderboards'
                    })
                  });
                  const json = await res.json();
                  if (res.ok && json.success) {
                    setSyncStatus({ 
                      success: true, 
                      message: json.message,
                      recordsSynced: json.recordsSynced,
                      metricsProcessed: json.metricsProcessed,
                      lastRun: json.timestamp 
                    });
                    setNotification({ message: json.message, type: 'success' });
                  } else {
                    setSyncStatus({ success: false, message: json.message || json.error || 'Sync pass failed.' });
                    setNotification({ message: json.message || json.error || 'Sync pass failed.', type: 'error' });
                  }
                } catch (err: any) {
                  setSyncStatus({ success: false, message: err.message || 'Synchronization failed.' });
                  setNotification({ message: err.message || 'Synchronization failed.', type: 'error' });
                } finally {
                  setSyncStatus(prev => ({ ...prev, loading: false }));
                }
              }}
              disabled={syncStatus.loading}
              className="w-full md:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center space-x-2"
            >
              {syncStatus.loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 text-white" />}
              <span>{syncStatus.loading ? 'Synchronizing...' : 'Run Sync Service Now'}</span>
            </button>
          </div>

          {syncStatus.message && (
            <div className={cn("p-4 rounded-xl border text-xs flex items-start space-x-3", syncStatus.success ? "bg-emerald-950/40 border-emerald-800 text-emerald-300" : "bg-red-950/40 border-red-800 text-red-300")}>
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{syncStatus.message}</p>
                {syncStatus.recordsSynced !== undefined && (
                  <p className="text-[11px] opacity-80 mt-1">
                    Records Synced: {syncStatus.recordsSynced} | Metrics: {syncStatus.metricsProcessed} | Timestamp: {syncStatus.lastRun ? new Date(syncStatus.lastRun).toLocaleTimeString() : 'Just now'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Vote Links */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Voting Links</h2>
            <button onClick={() => setIsAddingVoteLink(true)} className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-4">
            {voteLinks.map((link) => (
              <div key={link.id} className="glass p-4 rounded-2xl border-slate-800/50 flex items-center justify-between group">
                <div>
                  <p className="text-white font-bold">{link.name}</p>
                  <p className="text-xs text-slate-500 truncate max-w-[200px]">{link.url}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => { setEditingVoteLink(link); setVoteLinkForm({ name: link.name, url: link.url }); setIsAddingVoteLink(true); }} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setItemToDelete({ id: link.id, type: 'vote' })} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* News Articles */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">News Articles</h2>
            <button onClick={() => setIsAddingNews(true)} className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-4">
            {news.map((item) => (
              <div key={item.id} className="glass p-4 rounded-2xl border-slate-800/50 flex items-center justify-between group">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-slate-700" />
                  </div>
                  <div>
                    <p className="text-white font-bold">{item.title}</p>
                    <p className="text-xs text-slate-500">By {item.author}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => { setEditingNews(item); setNewsForm({ title: item.title, content: item.content, author: item.author, image_url: item.image_url || '' }); setIsAddingNews(true); }} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setItemToDelete({ id: item.id, type: 'news' })} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Server Rules */}
        <section className="space-y-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Server Rules</h2>
            <button onClick={() => setIsAddingRule(true)} className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rules.map((rule) => (
              <div key={rule.id} className="glass p-4 rounded-2xl border-slate-800/50 flex items-center justify-between group">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
                    <List className="w-5 h-5 text-slate-700" />
                  </div>
                  <div>
                    <p className="text-white font-bold">{rule.title}</p>
                    <p className="text-xs text-slate-500">Order: {rule.order}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => { setEditingRule(rule); setRuleForm({ title: rule.title, description: rule.description, order: rule.order }); setIsAddingRule(true); }} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setItemToDelete({ id: rule.id, type: 'rule' })} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Admin Emails */}
        <section className="space-y-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center space-x-3">
              <Shield className="w-6 h-6 text-red-500" />
              <span>Admin Access (Emails)</span>
            </h2>
            <button onClick={() => setIsAddingAdminEmail(true)} className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {adminEmails.map((admin) => (
              <div key={admin.id} className="glass p-4 rounded-2xl border-slate-800/50 flex items-center justify-between group">
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-slate-500" />
                  <p className="text-sm text-white font-medium">{admin.email}</p>
                </div>
                <button 
                  onClick={() => setItemToDelete({ id: admin.id, type: 'admin_email' })} 
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Change Security Password */}
        <section className="space-y-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center space-x-3">
              <SettingsIcon className="w-6 h-6 text-yellow-500" />
              <span>Change Security Password</span>
            </h2>
          </div>
          <div className="glass p-6 rounded-3xl border-slate-800/50">
            <p className="text-xs text-slate-400 mb-4 uppercase tracking-widest font-bold">Update your administrator account password</p>
            <form onSubmit={handlePasswordChange} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">New Password</label>
                <input
                  type="password"
                  required
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-purple-500/30 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-purple-500/30 text-sm"
                />
              </div>
              <div>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl transition-all text-sm flex items-center justify-center space-x-2"
                >
                  {passwordLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4.5 h-4.5" />
                  )}
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>

      {/* Vote Link Modal */}
      {isAddingVoteLink && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass w-full max-w-md rounded-3xl border-slate-800/50 overflow-hidden">
            <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">{editingVoteLink ? 'Edit Vote Link' : 'Add Vote Link'}</h3>
              <button onClick={() => { setIsAddingVoteLink(false); setEditingVoteLink(null); }} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleVoteLinkSubmit} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Site Name</label>
                <input required type="text" value={voteLinkForm.name} onChange={(e) => setVoteLinkForm({ ...voteLinkForm, name: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Vote URL</label>
                <input required type="url" value={voteLinkForm.url} onChange={(e) => setVoteLinkForm({ ...voteLinkForm, url: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-all neon-glow-purple">
                {editingVoteLink ? 'Update Link' : 'Add Link'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* News Modal */}
      {isAddingNews && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass w-full max-w-2xl rounded-3xl border-slate-800/50 overflow-hidden">
            <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">{editingNews ? 'Edit Article' : 'Post News Article'}</h3>
              <button onClick={() => { setIsAddingNews(false); setEditingNews(null); }} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleNewsSubmit} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Article Title</label>
                <input required type="text" value={newsForm.title} onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Author Name (Optional)</label>
                <input type="text" value={newsForm.author} onChange={(e) => setNewsForm({ ...newsForm, author: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Admin" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Image URL (Optional)</label>
                <input type="text" value={newsForm.image_url} onChange={(e) => setNewsForm({ ...newsForm, image_url: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="https://example.com/image.jpg" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Content (Markdown Supported)</label>
                <textarea required value={newsForm.content} onChange={(e) => setNewsForm({ ...newsForm, content: e.target.value })} rows={10} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm" />
              </div>
              <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-all neon-glow-purple">
                {editingNews ? 'Update Article' : 'Publish Article'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Rule Modal */}
      {isAddingRule && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass w-full max-w-md rounded-3xl border-slate-800/50 overflow-hidden">
            <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">{editingRule ? 'Edit Rule' : 'Add Rule'}</h3>
              <button onClick={() => { setIsAddingRule(false); setEditingRule(null); setRuleForm({ title: '', description: '', order: 0 }); }} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleRuleSubmit} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Rule Title</label>
                <input required type="text" value={ruleForm.title} onChange={(e) => setRuleForm({ ...ruleForm, title: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="No Griefing" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Description</label>
                <textarea required value={ruleForm.description} onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[100px]" placeholder="Do not destroy other players' buildings." />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Display Order</label>
                <input required type="number" value={ruleForm.order} onChange={(e) => setRuleForm({ ...ruleForm, order: parseInt(e.target.value) || 0 })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-all neon-glow-purple">
                {editingRule ? 'Update Rule' : 'Add Rule'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Admin Email Modal */}
      {isAddingAdminEmail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass w-full max-w-md rounded-3xl border-slate-800/50 overflow-hidden">
            <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Add Admin Email</h3>
              <button onClick={() => setIsAddingAdminEmail(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAdminEmailSubmit} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Gmail Address</label>
                <input 
                  required 
                  type="email" 
                  value={adminEmailForm.email} 
                  onChange={(e) => setAdminEmailForm({ email: e.target.value })} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500" 
                  placeholder="example@gmail.com"
                />
                <p className="text-[10px] text-slate-400 italic">This user will be granted admin permissions upon their next login.</p>
                <p className="text-[11px] text-yellow-500 italic bg-yellow-500/5 p-2 rounded-xl border border-yellow-500/10 mt-1.5 leading-relaxed">
                  Note: The default password for this email will be set to <strong className="font-mono text-yellow-400">adminmc</strong>. They can log in via <strong className="font-mono text-purple-400">/mcadmin</strong> and change it later in their own control settings panel.
                </p>
              </div>
              <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all neon-glow-red">
                Grant Admin Access
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
