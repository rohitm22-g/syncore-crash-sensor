import React, { useState, useMemo } from 'react';
import {
  History,
  Filter,
  Download,
  Trash2,
  Search,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Bell,
  Activity,
  FileSpreadsheet
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

export function EventHistoryPage({ events, onClearHistory }) {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(events.map((e) => e.category));
    return ['ALL', ...Array.from(set)];
  }, [events]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      // Category filter
      if (selectedCategory !== 'ALL' && evt.category !== selectedCategory) {
        return false;
      }
      // Search term filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchMsg = evt.message?.toLowerCase().includes(term);
        const matchCat = evt.category?.toLowerCase().includes(term);
        const matchId = evt.id?.toLowerCase().includes(term);
        if (!matchMsg && !matchCat && !matchId) return false;
      }
      // Date filter
      if (startDate) {
        const evtTime = new Date(evt.timestamp).getTime();
        const filterStart = new Date(startDate).getTime();
        if (evtTime < filterStart) return false;
      }
      if (endDate) {
        const evtTime = new Date(evt.timestamp).getTime();
        const filterEnd = new Date(endDate).getTime() + 86400000; // End of day
        if (evtTime > filterEnd) return false;
      }
      return true;
    });
  }, [events, selectedCategory, searchTerm, startDate, endDate]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredEvents.length === 0) return;
    const headers = [
      'ID',
      'Timestamp',
      'Category',
      'Linear_Accel_G',
      'Gyro_DPS',
      'Roll_Deg',
      'Pitch_Deg',
      'Alarm_State',
      'Details'
    ];
    const rows = filteredEvents.map((e) => [
      e.id,
      e.timestamp,
      `"${e.category}"`,
      e.linear_accel ?? '',
      e.gyro ?? '',
      e.roll ?? '',
      e.pitch ?? '',
      e.alarm ? 'ACTIVE' : 'CLEAR',
      `"${(e.message || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `syncore_event_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to JSON
  const handleExportJSON = () => {
    if (filteredEvents.length === 0) return;
    const blob = new Blob([JSON.stringify(filteredEvents, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `syncore_events_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold font-mono tracking-tight text-white">
              Incident & Event History
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              Persistent SQLite Storage
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Historical audit log of crash triggers, sideways tilt excursions, and manual tests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={filteredEvents.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 transition cursor-pointer disabled:opacity-40"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            Export CSV
          </button>
          <button
            onClick={handleExportJSON}
            disabled={filteredEvents.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 transition cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            JSON
          </button>
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to clear all event history records?')) {
                onClearHistory();
              }
            }}
            disabled={events.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-900/60 bg-rose-950/40 hover:bg-rose-900/60 text-xs font-mono text-rose-300 transition cursor-pointer disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-slate-800 bg-[#10141E]/90 p-4 space-y-3 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Category Filter */}
          <div>
            <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1">
              Event Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-black/40 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'ALL' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Search Term */}
          <div>
            <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1">
              Search Details / ID
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search event keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black/40 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Date Range Start */}
          <div>
            <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-black/40 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Date Range End */}
          <div>
            <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-black/40 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs font-mono text-slate-400">
          <span>
            Showing <strong className="text-cyan-300">{filteredEvents.length}</strong> of{' '}
            <strong className="text-slate-300">{events.length}</strong> total records
          </span>
          {(selectedCategory !== 'ALL' || searchTerm || startDate || endDate) && (
            <button
              onClick={() => {
                setSelectedCategory('ALL');
                setSearchTerm('');
                setStartDate('');
                setEndDate('');
              }}
              className="text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Events Table */}
      <div className="rounded-xl border border-slate-800 bg-[#10141E]/90 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 bg-[#0E121B] text-slate-400 uppercase text-[11px]">
                <th className="py-3 px-3.5">EVENT ID</th>
                <th className="py-3 px-3.5">TIMESTAMP</th>
                <th className="py-3 px-3.5">CATEGORY</th>
                <th className="py-3 px-3.5">LINEAR ACCEL</th>
                <th className="py-3 px-3.5">ANGULAR VELOCITY</th>
                <th className="py-3 px-3.5">ROLL</th>
                <th className="py-3 px-3.5">PITCH</th>
                <th className="py-3 px-3.5">ALARM</th>
                <th className="py-3 px-3.5">DESCRIPTION & TELEMETRY NOTES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No matching events found in history.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-3.5 font-bold text-slate-300">{evt.id}</td>
                    <td className="py-3 px-3.5 text-slate-400 whitespace-nowrap">
                      {new Date(evt.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          evt.category.includes('Impact') || evt.category.includes('Excessive')
                            ? 'bg-rose-950/70 text-rose-300 border border-rose-500/40'
                            : evt.category.includes('Test')
                            ? 'bg-amber-950/60 text-amber-300 border border-amber-500/40'
                            : evt.category.includes('Reset')
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {evt.category}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 font-bold text-slate-200">
                      {evt.linear_accel !== undefined ? `${evt.linear_accel} G` : '--'}
                    </td>
                    <td className="py-3 px-3.5 text-slate-200">
                      {evt.gyro !== undefined ? `${evt.gyro} °/s` : '--'}
                    </td>
                    <td className="py-3 px-3.5 text-slate-200">
                      {evt.roll !== undefined ? `${evt.roll}°` : '--'}
                    </td>
                    <td className="py-3 px-3.5 text-slate-200">
                      {evt.pitch !== undefined ? `${evt.pitch}°` : '--'}
                    </td>
                    <td className="py-3 px-3.5">
                      <StatusBadge
                        type={evt.alarm ? 'alarm' : 'normal'}
                        label={evt.alarm ? 'ALARM' : 'CLEAR'}
                        size="sm"
                      />
                    </td>
                    <td className="py-3 px-3.5 text-slate-300 max-w-xs truncate" title={evt.message}>
                      {evt.message || 'Kinematic event registered by detector.'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
